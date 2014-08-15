var editorInstance: NovelEditer.NovelEditer;
$(() =>
{
    editorInstance = new NovelEditer.NovelEditer($(".edit-context"), $(".preview-body"), $(".preview-context"));
    editorInstance.updateToshow();
    editPage.onChanged();
});

module NovelEditer
{
    export class NovelEditer
    {
        private static _endOfLineChar: string[] = ["\n"];
        private static _shiftCaretKeys: number[] = [KeyCodes.KeyCode.ArrowRight, KeyCodes.KeyCode.ArrowLeft, KeyCodes.KeyCode.ArrowDown, KeyCodes.KeyCode.ArrowUp];
        //ユーザーが記述してるエディタ
        private _editorTarget: JQuery;
        //縦書きのやつ
        private _previewTarget: JQuery;
        //なにこれわかんね
        private _previewBounds: JQuery;

        //直前のカレット位置
        private _lastCaret: TextRegion = new TextRegion(0, 0);
        //直前の編集文字列
        private _lastText:string ="";

        //段落管理
        private _paragraphManager:ParagraphManager;

        //ペーストフラグ
        private _isPasted: boolean;

        constructor(editorTarget: JQuery, previewTarget: JQuery, previewBounds: JQuery)
        {
            this._previewBounds = previewBounds;
            this._editorTarget = editorTarget;
            this._previewTarget = previewTarget;
            this._editorTarget.keyup((event: JQueryKeyEventObject) => this.saveInput(event));
            //マウスによってキャレットが移動した際は位置を保存しておく
            //this._editorTarget.mousedown(() => this.mouseHandler());
            this._editorTarget.mouseup(() => this.mouseHandler());
            this._editorTarget.bind('paste', () => this.pasteCommited());
            this._editorTarget.bind('input propertychange', () => this.textChanged());
            this._paragraphManager = new ParagraphManager();
        }
        //カレットと編集文字列のログを更新する
        updateLastData()
        {
            this._lastCaret = TextRegion.fromCaretInfo(this._editorTarget.caret());
            this._lastText = this._editorTarget.val();
        }

        pasteCommited()//ペースト直前に呼ばれる？
        {
            this._isPasted = true;
            this._lastText = this._editorTarget.val();
            this._lastCaret = TextRegion.fromCaretInfo(this._editorTarget.caret());
        }

        textChanged()
        {
            console.info("textChanged is Called...!:\t"+this._editorTarget.val());
            if (this._isPasted)
            {
                var diffLength = this._editorTarget.val().length - this._lastText.length;//ペーストによる変化長？
                var difftext:string = this._editorTarget.val().substr(this._lastCaret.begin, diffLength);//変化した部分
                //直前の段落カレット位置取得
                var pos: CaretPosition = this._paragraphManager.getCaretPositionAsParag(this._lastCaret.begin);

                //ペースト位置が段落の隙間なら、その隙間に挿入
                //段落の中なら、その位置で段落を二つに分けて、その間に挿入
                var frontParag: Paragraph;
                var backParag: Paragraph;
                var currentParag: Paragraph = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex);
                var frontStr: string;
                var backStr: string;
                if (pos.paragraphIndex == 0)//先頭段落
                {
                    frontParag = null;
                    if (pos.paragraphIndex == this._paragraphManager.lastParagraphIndex)backParag = null;
                    else backParag = currentParag.nextParagraph;
                }
                else if (pos.paragraphIndex==this._paragraphManager.lastParagraphIndex)//最終段落
                {
                    frontParag = currentParag.prevParagraph;
                    backParag = null;
                }
                else//段落の中間
                {
                    frontParag = currentParag.prevParagraph;
                    backParag = currentParag.nextParagraph;
                }
                frontStr = currentParag.rawText.substring(0, pos.charIndex);
                backStr = currentParag.rawText.substring(pos.charIndex, this._paragraphManager.headParagraph.rawText.length);

                difftext = frontStr + difftext + backStr;
                currentParag.removeThis();

                var pasteParag: Paragraph = this._paragraphManager.createParagraphFromText(difftext);//変化した部分を段落化

                if (backParag != null)
                {
                    pasteParag.getLastParagraph().insertNext(backParag);
                    
                }
                if (frontParag != null)
                {
                    frontParag.insertNext(pasteParag);
                }
                if (backParag==null&&frontParag==null)
                {
                    this._paragraphManager.currentParagraph = pasteParag;
                    this._paragraphManager.headParagraph = pasteParag;
                    pasteParag.updateParagraphIndex();
                }

                this.updateLastData();
                this._isPasted = false;
            }
            //else
            //{
            //    var caret: TextRegion = TextRegion.fromCaretInfo(this._editorTarget.caret());//現在のカレット取得
            //    if (!caret.isRegion() && !this._lastCaret.isRegion()) //範囲指定じゃない
            //    {
            //        //Enterによる改行
            //        if (event.keyCode == KeyCodes.KeyCode.Enter && this._editorTarget.val().charCodeAt(caret.begin - 1) == 0x0a) {
            //            /*直前のカレット位置が
            //             *段落末尾なら、その後ろに新規段落を挿入し、これをcarrentに。
            //             * 段落先頭なら、その前に新規段落を挿入し、carrentはそのまま。
            //             * 段落中なら、そこで分断し、後ろのほうをcarrent
            //             */
            //            console.info("catch [Enter]");
            //            var pos: CaretPosition = this._paragraphManager.getCaretPositionAsParag(this._lastCaret.begin);//直前のカレット位置
            //            if (pos.isParagraphLast)//段落末尾
            //            {
            //                this._paragraphManager.getParagraphByIndex(pos.paragraphIndex).insertNext(
            //                    new Paragraph(this._paragraphManager, ""));
            //                this._paragraphManager.moveNext();
            //            }
            //            else if (pos.charIndex == 0)//段落先頭
            //            {
            //                this._paragraphManager.getParagraphByIndex(pos.paragraphIndex).insertPrev(
            //                    new Paragraph(this._paragraphManager, ""));
            //            }
            //            else {
            //                var div = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex).sepalateParagraph(pos.charIndex);
            //                this._paragraphManager.changeCurrentParagraph(div.nextParagraph);
            //            }
            //        }
            //        else if (event.keyCode == KeyCodes.KeyCode.BackSpace && caret.begin != 0) {
            //            console.info("catch [Back]");

            //            var lastCaretPos: CaretPosition = this._paragraphManager.getCaretPositionAsParag(this._lastCaret.begin);
            //            var currentCaretPos: CaretPosition = this._paragraphManager.getCaretPositionAsParag(caret.begin);

            //            var backStr: string;//切られた後ろの文字列
            //            var backParag: Paragraph;//切られた後ろの次の段落
            //            if (lastCaretPos.isTextLast) {
            //                backStr = "";
            //                backParag = null;
            //            }
            //            else {
            //                var pr: Paragraph = this._paragraphManager.getParagraphByIndex(lastCaretPos.paragraphIndex);
            //                backStr = pr.rawText.substring(lastCaretPos.charIndex, pr.rawText.length);
            //                if (pr.isFinalParagraph) backParag = null;
            //                else backParag = pr.nextParagraph;
            //            }

            //            var frontStr: string;//切られた前の文字列
            //            var frontParag: Paragraph;//切られた前の文字列の段落

            //            frontParag = this._paragraphManager.getParagraphByIndex(currentCaretPos.paragraphIndex);
            //            frontStr = frontParag.rawText.substr(0, currentCaretPos.charIndex);

                //        var currentIndex: number = this._paragraphManager.currentParagraph.getParagraphIndex();
                //        if (currentCaretPos.paragraphIndex < currentIndex && currentIndex <= lastCaretPos.paragraphIndex)//currentが削除されるとき
                //        {
                //            this._paragraphManager.changeCurrentParagraph(frontParag);
                //        }

                //        frontParag.rawText = frontStr + backStr;
                //        frontParag.nextParagraph = backParag;
                //        frontParag.updateParagraphIndex();
                //        frontParag.updateCacheHtml();
                //        /*
                //         * 直前のカレットのend位置から、現在のカレットのbegin位置まで削除
                //         * 直前が段落中、段落末尾なら、その段落に接続
                //         * 段落先頭なら、つなげる先の先頭を新しい段落にして接続
                //         * 現在が先頭なら、直前につなげる
                //         */
                //    }
                //    else if (event.keyCode == KeyCodes.KeyCode.Delete)
                //    {
                //        console.info("catch [Del]");

                //        var delCount = this._lastText.length - this._editorTarget.val().length;
                //        //文字列の長さからデリーとされた文字列の長さを考える。
                //        //var lnc2 = this.countLf(this._lastTextOnKeyDown.substr(caret.begin, delCount));
                //        //if (lnc2 != 0)
                //        //{
                //        //    this._currentParagraph.nextParagraph.removeRange(lnc2 - 1);
                //        //}
                //        /*
                //         * 算出した削除長で上のbackspaceと同様に削除
                //         */
                //    }
                //    this._paragraphManager.reLoadParagraph(this._editorTarget.val(), caret.begin);
                //    this.updateToshow();

                //    //this._lastCaret = caret;
                //    //this._lastText = this._editorTarget.val();
                //    this.updateLastData();

                //    console.info("\tcurrent       =\t" + this._paragraphManager.currentParagraph.getParagraphIndex() + ":" +
                //        this._paragraphManager.currentParagraph.rawText);
                //    console.info("\tlastCurret:   =\t" + this._lastCaret.begin);
                //    console.info("\tparagraphCount=\t" + this._paragraphManager.paragraphCount + "\n");
                //}
            //}
        }

        //private _lastParagraphNumberSpan: JQuery;
        //private _pageFirstParagraph: Paragraph;
        private _focusLine: string;
        //private _previewKeycode: number;
        //private _lastLnCount: number;



        //キー入力による編集文字列変化の反映処理
        saveInput(event: JQueryKeyEventObject)
        {
            console.info("saveInput is Called...!");
            var caret: TextRegion = TextRegion.fromCaretInfo(this._editorTarget.caret());//現在のカレット取得
            if (!caret.isRegion() && !this._lastCaret.isRegion())//範囲指定じゃない
            {
                //Enterによる改行
                if (event.keyCode == KeyCodes.KeyCode.Enter && this._editorTarget.val().charCodeAt(caret.begin - 1) == 0x0a)
                {
                    /*直前のカレット位置が
                     *段落末尾なら、その後ろに新規段落を挿入し、これをcarrentに。
                     * 段落先頭なら、その前に新規段落を挿入し、carrentはそのまま。
                     * 段落中なら、そこで分断し、後ろのほうをcarrent
                     */
                    console.info("catch [Enter]");
                    var pos: CaretPosition = this._paragraphManager.getCaretPositionAsParag(this._lastCaret.begin);//直前のカレット位置
                    if (pos.isParagraphLast)//段落末尾
                    {
                        this._paragraphManager.getParagraphByIndex(pos.paragraphIndex).insertNext(
                            new Paragraph(this._paragraphManager, ""));
                        this._paragraphManager.moveNext();
                    }
                    else if(pos.charIndex==0)//段落先頭
                    {
                        this._paragraphManager.getParagraphByIndex(pos.paragraphIndex).insertPrev(
                            new Paragraph(this._paragraphManager, ""));
                    }
                    else
                    {
                        var div = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex).sepalateParagraph(pos.charIndex);
                        this._paragraphManager.changeCurrentParagraph(div.nextParagraph);
                    }
                }
                else if (_.include(NovelEditer._shiftCaretKeys, event.keyCode))
                {//矢印キーによる移動
                    console.info("catch [Arrow]");
                    var subStr: string;
                    if (this._lastCaret.begin < caret.begin)
                    {
                        subStr = this._lastText.substring(this._lastCaret.begin, caret.begin);
                        var clf: number = this.countLf(subStr);
                        for (var i = 0; i < clf; i++)
                        {
                            this._paragraphManager.moveNext();
                        }
                    }
                    else if (this._lastCaret.begin > caret.begin)
                    {
                        subStr = this._lastText.substring(caret.begin, this._lastCaret.begin);
                        var clf: number = this.countLf(subStr);
                        for (var i = 0; i < clf; i++)
                        {
                            this._paragraphManager.movePrev();
                        }
                    }
                    /*直前と現在の
                     * カレット位置の間に挟まれる文字列を取得し、その中に現れる改行コード分だけ
                     * currentをずらす
                     */
                }
                else if (event.keyCode == KeyCodes.KeyCode.BackSpace && caret.begin != 0)
                {
                    console.info("catch [Back]");

                    var lastCaretPos: CaretPosition = this._paragraphManager.getCaretPositionAsParag(this._lastCaret.begin);
                    var currentCaretPos: CaretPosition = this._paragraphManager.getCaretPositionAsParag(caret.begin);

                    var backStr: string;//切られた後ろの文字列
                    var backParag: Paragraph;//切られた後ろの次の段落
                    if (lastCaretPos.isTextLast)
                    {
                        backStr = "";
                        backParag = null;
                    }
                    else
                    {
                        var pr: Paragraph = this._paragraphManager.getParagraphByIndex(lastCaretPos.paragraphIndex);
                        backStr = pr.rawText.substring(lastCaretPos.charIndex, pr.rawText.length);
                        if (pr.isFinalParagraph) backParag = null;
                        else backParag = pr.nextParagraph;
                    }

                    var frontStr: string;//切られた前の文字列
                    var frontParag: Paragraph;//切られた前の文字列の段落

                    frontParag = this._paragraphManager.getParagraphByIndex(currentCaretPos.paragraphIndex);
                    frontStr = frontParag.rawText.substr(0, currentCaretPos.charIndex);

                    var currentIndex: number = this._paragraphManager.currentParagraph.getParagraphIndex();
                    if (currentCaretPos.paragraphIndex < currentIndex && currentIndex <= lastCaretPos.paragraphIndex)//currentが削除されるとき
                    {
                        this._paragraphManager.changeCurrentParagraph(frontParag);
                    }

                    frontParag.rawText = frontStr + backStr;
                    frontParag.nextParagraph = backParag;
                    frontParag.updateParagraphIndex();
                    frontParag.updateCacheHtml();
                    /*
                     * 直前のカレットのend位置から、現在のカレットのbegin位置まで削除
                     * 直前が段落中、段落末尾なら、その段落に接続
                     * 段落先頭なら、つなげる先の先頭を新しい段落にして接続
                     * 現在が先頭なら、直前につなげる
                     */
                }
                else if (event.keyCode == KeyCodes.KeyCode.Delete)
                {
                    console.info("catch [Del]");

                    var delCount = this._lastText.length - this._editorTarget.val().length; 
                    //文字列の長さからデリーとされた文字列の長さを考える。
                    //var lnc2 = this.countLf(this._lastTextOnKeyDown.substr(caret.begin, delCount));
                    //if (lnc2 != 0)
                    //{
                    //    this._currentParagraph.nextParagraph.removeRange(lnc2 - 1);
                    //}
                    /*
                     * 算出した削除長で上のbackspaceと同様に削除
                     */
                }
            }
            this._paragraphManager.reLoadParagraph(this._editorTarget.val(), caret.begin);
            this.updateToshow();

            //this._lastCaret = caret;
            //this._lastText = this._editorTarget.val();
            this.updateLastData();

            console.info("\tcurrent       =\t" + this._paragraphManager.currentParagraph.getParagraphIndex() + ":"+
                this._paragraphManager.currentParagraph.rawText);
            console.info("\tlastCurret:   =\t" + this._lastCaret.begin);
            console.info("\tparagraphCount=\t"+this._paragraphManager.paragraphCount+"\n");
        }

        updateToshow()
        {
            var i: number = 1;
            while (i <= this._paragraphManager.lastParagraphIndex + 1) {
                this._previewTarget.html(this._paragraphManager.headParagraph.getParagraphHtmls(i));
                if (this._previewTarget.width() > this._previewBounds.width()) {
                    this._previewTarget.html(this._paragraphManager.headParagraph.getParagraphHtmls(i - 1));
                    break;
                }
                i++;
            }
        }



        //private _calcFocusRegion(text: string, selectionBegin: number, selectionEnd: number): TextRegion
        //{
        //    var length: number = text.length;
        //    var end = selectionEnd, begin = selectionBegin;
        //    if (!_.include(NovelEditer._endOfLineChar, text.substr(end, 1)))
        //        for (var i = selectionEnd; i < length; i++)
        //        {
        //            end = i + 1;
        //            if (_.include(NovelEditer._endOfLineChar, text.substr(end, 1))) break;
        //        }
        //    for (i = selectionBegin; i >= 0; i--)
        //    {
        //        begin = i;
        //        if (i == 0 || _.include(NovelEditer._endOfLineChar, text.substr(i - 1, 1))) break;
        //    }
        //    return new TextRegion(begin, end);
        //}

        //updateFocusLine(): void
        //{
        //    var currentText: string = this._editorTarget.val();
        //    var caret: CaretInfo = this._editorTarget.caret();
        //    var region = this._calcFocusRegion(currentText, caret.begin, caret.end);
        //    this._focusLine = region.substr(currentText);
        //    console.warn("focusLine:" + this._focusLine);
        //}

        //改行の数をカウントする
        countLf(str: string): number
        {
            var count = 0;
            for (var i = 0; i < str.length; i++)
            {
                if (str.charCodeAt(i) == 0x0a)
                {
                    count++;
                }
            }
            return count;
        }

        mouseHandler()
        {
            console.info("mouseHandler is Called...!");
            var caret: TextRegion = TextRegion.fromCaretInfo(this._editorTarget.caret());
            //this._caret = caret;
            //this.updateFocusLine();
            //var region = TextRegion.fromCaretInfo(this._editorTarget.caret());
            //if (!region.isRegion())
            //{
            //    var lfc = this.countLf(this._lastText.substr(0, region.begin));
            //    this.currentParagraphChanged(this._pageFirstParagraph.getParagraph(lfc));
            //    this.updateToshow();
            //}
        }
    }
    export class ParagraphManager
    {
        //先頭の段落
        private _headParagraph: Paragraph;
        //最終段落のインデックス
        private _lastParagraphIndex: number=0;
        //現在の段落
        private _currentParagraph: Paragraph;

        constructor()
        {
            this._headParagraph = new Paragraph(this, "");
            this._lastParagraphIndex = 0;
            this._currentParagraph = this._headParagraph;
        }

        get lastParagraphIndex(): number
        {
            return this._lastParagraphIndex;
        }
        set lastParagraphIndex(index:number)
        {
            this._lastParagraphIndex = index;
        }
        get headParagraph(): Paragraph
        {
            return this._headParagraph;
        }
        set headParagraph(val: Paragraph)
        {
            this._headParagraph = val;
        }
        get currentParagraph(): Paragraph
        {
            return this._currentParagraph;
        }

        //段落数
        get paragraphCount(): number
        {
            return this._lastParagraphIndex + 1;
        }

        //現在の段落(とその強調表示)を変更する
        changeCurrentParagraph(currentParagraph: Paragraph)
        {
            this._currentParagraph.isEmphasized = false;
            this._currentParagraph = currentParagraph;
            this._currentParagraph.isEmphasized = true;
            console.info("currentParagraph:" + currentParagraph.rawText);
        }
        //現在の段落(とその強調表示)をインデックス指定で変更する
        changeCurrentParagraphByIndex(paragraphIndex: number)
        {
            var parag: Paragraph = this._currentParagraph.getParagraphByIndex(paragraphIndex);
            this.changeCurrentParagraph(parag);
        }

        //現在のパラグラフを次に移動する。現在が末尾だったら何もせずfalse
        moveNext():boolean
        {
            if (this._currentParagraph.isFinalParagraph) return false;
            this.changeCurrentParagraph(this._currentParagraph.nextParagraph);
            return true;
        }
        //現在のパラグラフを前に移動する。現在が先頭だったら何もせずfalse
        movePrev():boolean
        {
            if (this._currentParagraph.isFirstParagraph)return false;
            this.changeCurrentParagraph(this._currentParagraph.prevParagraph);
            return true;
        }
        //末尾に段落を追加する
        addParagraph(parag: Paragraph)
        {
            if (this._lastParagraphIndex == 0)
            {
                this._headParagraph = parag;
                this._currentParagraph = parag;
                parag.updateParagraphIndex();
                return;
            }
            this._currentParagraph.getLastParagraph().insertNext(parag);
        }
        //指定したインデックスの段落を取得
        getParagraphByIndex(index: number): Paragraph
        {
            return this._headParagraph.getParagraphByIndex(index);
        }
        //テキストを改行で分割してパラグラフに分ける。先頭を返す
        createParagraphFromText(str: string): Paragraph
        {
            while (str.substr(str.length-1,1)=="\n")//末尾の改行文字を削除
            {
                str = str.substr(0, str.length - 1);
            }
            var num: number = str.indexOf("\n");//改行を探す
            if (num == -1) return new Paragraph(this, str);//改行がなければそのまま返す

            var parag: Paragraph = new Paragraph(this, str.substr(0, num));//改行の手前まで
            str = str.substr(num + 1, str.length - num - 1);//改行の後ろ

            while (str.length!=0)//後ろが""でなければ
            {
                num = str.indexOf("\n");//改行を探す
                if (num == -1)//改行がなければ終了
                {
                    parag.insertNext(new Paragraph(this, str));
                    return parag.getFirstParagraph();
                }
                parag.insertNext(new Paragraph(this, str.substr(0, num)));
                parag = parag.nextParagraph;
                str = str.substr(num + 1, str.length - num - 1);//改行の後ろ
            }
            return parag.getFirstParagraph();
        }
        //指定したカレット位置を段落上のカレット位置に変換する
        getCaretPositionAsParag(caretPos: number):CaretPosition
        {
            var parag: Paragraph = this._headParagraph;
            var paragPos: number = 0;
            while (parag.rawText.length<caretPos)
            {
                caretPos -= parag.rawText.length + 1;
                paragPos = paragPos + 1;
                if (caretPos == 0 && parag.isFinalParagraph)
                {
                    var ret: CaretPosition = new CaretPosition(paragPos, 0);
                    ret.isParagraphLast = true;
                    ret.isTextLast = true;
                    return ret;
                }
                if (parag.isFinalParagraph)
                {
                    /*
                     * 編集文字列への入力後、saveInputが呼ばれるまでの僅かな隙間にEnter等によって
                     * targetEditor.varが変化するとlastCaret、lastTextとの整合性が崩れてここが呼ばれる？
                     */
                    var sss = 0;
                    sss++;
                }
                parag = parag.nextParagraph;
            }
            var pos: CaretPosition = new CaretPosition(paragPos, caretPos);
            if (parag.rawText.length == caretPos)//段落末尾
            {
                pos.isParagraphLast = true;
                if (pos.paragraphIndex == this._lastParagraphIndex)pos.isTextLast = true;
            }
            return pos;
        }
        //現在のカレットの編集文字列を再読み込み
        reLoadParagraph(text: string, caretPos: number)
        {
            this._currentParagraph.paragraphReload(text, caretPos);
        }
    }

    export class Paragraph implements IParagraph
    {
        //マークアップ付の生テキスト
        private _rawText: string;
        //段落管理クラス
        private _manager: ParagraphManager;
        //前の段落
        prevParagraph: Paragraph;
        //次の段落
        nextParagraph: Paragraph;
        //段落番号(先頭は0)
        private _paragraphIndex: number = 0;
        //生成されたHTML
        private _cacheHtml: string;
        //強調表示フラグ
        private _isEmphasized: boolean = false;
        //ID
        private _iD: string;

        constructor(manager: ParagraphManager, rawText: string)
        {
            this._manager = manager;
            this._rawText = rawText;
            this.updateCacheHtml();
        }

        getPrevParagraph():IParagraph
        {
            return this.prevParagraph;
        }

        getNextParagraph(): IParagraph
        {
            return this.nextParagraph;
        }

        getCachedHtml(): string
        {
            return this._cacheHtml;
        }

        getParagraphIndex(): number
        {
            return this._paragraphIndex;
        }
        getId(): string
        {
            return this._iD;
        }

        toJSON(): string//じっそうしといて
        {
            return "notImplement!!!!!!!!!!!!!!!!";
        }
        fromJSON(str: string): void//じっそうしといて
        {
            var exception = "notImplement!!!!!!!!!!!!!!!!";
        }
        set isEmphasized(isem: boolean)
        {
            this._isEmphasized = isem;
            this.updateCacheHtml();
        }

        get isEmphasized(): boolean
        {
            return this._isEmphasized;
        }

        get rawText(): string
        {
            return this._rawText;
        }
        set rawText(raw: string)
        {
            this._rawText = raw;
            this.updateCacheHtml();
        }

        //これが最終段落か否か
        get isFinalParagraph(): boolean
        {
            return this.nextParagraph == null;
        }

        //これが最初の段落か否か
        get isFirstParagraph(): boolean
        {
            return this.prevParagraph == null;
        }

        //HTML再生成
        updateCacheHtml()
        {
            var prefixes: any[] = [new TitlePrefix(), new DividerPrefix()];
            var tag: JQuery;
            var rawStr: string = this._rawText;
            rawStr.replace(" ", "&ensp;"); //半角スペースは特殊文字として置き換える
            if (Utils.StringUtility.isEmpty(this._rawText))
            {
                this._cacheHtml = "<br/>";
                return;
            }
            var isPrefixed: boolean = false;
            for (var i = 0; i < prefixes.length; i++)
            {
                if (prefixes[i].isPrefixOfMe(rawStr))
                {
                    tag = $(prefixes[i].getFormattedHtml(rawStr));
                    isPrefixed = true;
                    break;
                }
            }
            if (!isPrefixed)
            {
                tag = $("<p/>");
                //エスケープ処理
                if (rawStr.charCodeAt(0) == 0x5c && rawStr.length > 1 && rawStr.charCodeAt(1) == 0x5c) rawStr = "\\" + rawStr.substr(2, rawStr.length - 2); //\\の場合は\にする
                else if (rawStr.charCodeAt(0) == 0x5c && rawStr.charCodeAt(1) != 0x5c)
                {
                    rawStr = rawStr.substr(1, rawStr.length - 1);
                }

                tag.html(rawStr);
            }
           
            tag.addClass("p-" + this._paragraphIndex);
            if (this.isEmphasized) tag.addClass("em");
            this._cacheHtml = $("<div/>").append(tag).html();
        }
        //段落番号と最終段落番号の更新。常に整合性を保つ
        updateParagraphIndex()
        {
            if (this.prevParagraph != null)
            {
                this._paragraphIndex = this.prevParagraph._paragraphIndex + 1;
            }
            else
            {
                this._paragraphIndex = 0;
                this._manager.headParagraph = this;
            }
            if (!this.isFinalParagraph) this.nextParagraph.updateParagraphIndex();
            else this._manager.lastParagraphIndex = this._paragraphIndex;
        }

        //指定した段落をこの段落の直後に挿入
        insertNext(next: Paragraph)
        {
            if (!this.isFinalParagraph)
            {
                var last: Paragraph = next.getLastParagraph();
                last.nextParagraph = this.nextParagraph;
                this.nextParagraph.prevParagraph = last;
            }
            next.prevParagraph = this;
            this.nextParagraph = next;
            next.updateParagraphIndex();
        }
         //指定した段落をこの段落の直前に挿入
        insertPrev(prev: Paragraph)
        {
            if (!this.isFirstParagraph)
            {
                prev.prevParagraph = this.prevParagraph;
                this.prevParagraph.nextParagraph = prev;
            }
            var last: Paragraph = prev.getLastParagraph();
            last.nextParagraph = this;
            this.prevParagraph = last;
            prev.updateParagraphIndex();
        }
        //指定したインデックスの段落を取得
        getParagraphByIndex(index: number): Paragraph
        {
            if (!this.isFirstParagraph) return this._manager.headParagraph.getParagraphByIndex(index);
            var parag: Paragraph = this;
            for (var i = 0; i < index; i++)
            {
                parag = parag.nextParagraph;
            }
            return parag;
        }
        //この段落リストの末尾を取得
        getLastParagraph(): Paragraph
        {
            var parag: Paragraph = this;
            while (!parag.isFinalParagraph)
            {
                parag = parag.nextParagraph;
            }
            return parag;
        }
        //この段落リストの先頭を取得
        getFirstParagraph(): Paragraph
        {
            if (this.isFirstParagraph) return this;
            var parag: Paragraph = this;
            while (!parag.isFirstParagraph)
            {
                parag = parag.prevParagraph;
            }
            return parag;
        }
        //指定した番目までの段落のhtmlを結合して返す。
        getParagraphHtmls(count: number): string
        {
            var cachedHtml: string = this._cacheHtml;
            var currentParagraph: Paragraph = this;
            //JSだと再帰でやるとすぐにメモリ無くなるのでforでやる
            for (var i = 0; i < count && !currentParagraph.isFinalParagraph; i++)
            {
                currentParagraph = currentParagraph.nextParagraph;
                cachedHtml += currentParagraph._cacheHtml;
            }
            return cachedHtml;
        }
        //生テキストを結合して返す。
        getParagraphRawTexts(count: number): string
        {
            var cachedRawText: string = this.rawText;
            var currentParagraph: Paragraph = this;
            //JSだと再帰でやるとすぐにメモリ無くなるのでforでやる
            for (var i = 0; i < count && !currentParagraph.isFinalParagraph; i++)
            {
                currentParagraph = currentParagraph.nextParagraph;
                cachedRawText += "\n"+currentParagraph.rawText;//改行をはさんでおく
            }
            return cachedRawText;
        }
        //この段落を削除する
        removeThis()
        {
            if (this.isFinalParagraph)
            {
                if (this.isFirstParagraph)//この行しかないとき
                {
                    this.rawText = "";
                    this.updateParagraphIndex();
                    return;
                }
                this.prevParagraph.nextParagraph = null;
                this._manager.lastParagraphIndex--;
                if (this._manager.currentParagraph == this) this._manager.changeCurrentParagraph(this.prevParagraph);
                return;
            }
            if (this.isFirstParagraph)
            {
                this.nextParagraph.prevParagraph = null;
                this.nextParagraph.updateParagraphIndex();
                if (this._manager.currentParagraph == this) this._manager.changeCurrentParagraph(this.nextParagraph);
                return;
            }
            else
            {
                this.prevParagraph.nextParagraph = this.nextParagraph;
                this.nextParagraph.prevParagraph = this.prevParagraph;
                this.nextParagraph.updateParagraphIndex();
                if (this._manager.currentParagraph == this) this._manager.changeCurrentParagraph(this.prevParagraph);
            }
        }
        //この段落の指定した位置で、この段落を二つの段落に分ける。分けた前半の段落を返す
        sepalateParagraph(pos: number):Paragraph
        {
            var front: Paragraph = new Paragraph(this._manager, this._rawText.substr(0, pos));
            var back: Paragraph = new Paragraph(this._manager, this._rawText.substr(pos, this._rawText.length - pos));

            if (this._manager.currentParagraph == this) this._manager.changeCurrentParagraph(back);

            front.nextParagraph = back;
            back.prevParagraph = front;

            this.removeThis();
            if (!this.isFinalParagraph)
            {
                back.nextParagraph = this.nextParagraph;
                this.nextParagraph.prevParagraph = back;
            }
            if (!this.isFirstParagraph)
            {
                front.prevParagraph = this.prevParagraph;
                this.prevParagraph.nextParagraph = front;
                //this.prevParagraph.insertNext(front);
                //return front;
            }
            front.updateParagraphIndex();
            return front;
        }

        //文字列の指定したカレット位置を含むように段落文を再構成します
        paragraphReload(text: string, caretPos: number) {
            var begin: number = caretPos;
            var end = caretPos;
            for (var i = caretPos-1; i >=0; i--) {
                if (text.charCodeAt(i) == 0x0a) break;
                begin = i;
            }
            for (var j = caretPos; j < text.length+1; j++) {
                end = j;
                if (text.charCodeAt(j) == 0x0a) break;
            }
            var subtext: string = text.substring(begin, end);
            this._rawText = subtext;
            this.updateCacheHtml();
        }

        toString(): string
        {
            return this.rawText;
        }
    }

    class PrefixBase
    {
        isPrefixOfMe(str: string): boolean
        {
            if (str.charCodeAt(0) == 0x5c) return false; //最初が\のときエスケープする
            if (Utils.StringUtility.startWith(str, this.getPrefixString())) return true;
            return false;
        }

        getPrefixString(): string
        {
            return "Not Implemented!";
        }

        getFormattedHtml(str: string): string
        {
            var preLength: number = this.getPrefixString().length;
            return this.getFormattedHtmlImpl(str.substr(preLength, str.length - preLength));
        }

        getFormattedHtmlImpl(str: string): string
        {
            return "Not Implemented!";
        }
    }

    class TitlePrefix extends PrefixBase
    {
        getPrefixString(): string
        {
            return "#";
        }

        getFormattedHtmlImpl(str: string): string
        {
            return "<h1>" + str + "</h1>";
        }
    }

    class DividerPrefix extends PrefixBase
    {
        getPrefixString(): string
        {
            return "-";
        }

        getFormattedHtmlImpl(str: string): string
        {
            return "<hr/>";
        }
    }
    //段落上でのカレット位置をあらわすクラス
    export class CaretPosition
    {
        //カレットのある段落位置
        paragraphIndex: number;
        //カレットのある段落での、先頭からの位置
        charIndex: number;
        isTextLast: boolean = false;//テキストの末尾であることを表す。
        isParagraphLast:boolean=false;//段落末尾であることを表す。
        constructor(paragIndex: number, charIndex: number)
        {
            this.paragraphIndex = paragIndex;
            this.charIndex = charIndex;
        }
    }
    //テキストの選択領域を表すクラス
    class TextRegion
    {
        public static fromCaretInfo(caret: CaretInfo): TextRegion
        {
            return new TextRegion(caret.begin, caret.end);
        }

        constructor(begin: number, end: number)
        {
            this.begin = begin;
            this.end = end;
        }

        begin: number;
        end: number;

        public substr(text: string): string
        {
            return text.substr(this.begin, this.end - this.begin);
        }

        public isRegion(): boolean
        {
            return this.begin != this.end;
        }

        public isFirst(): boolean
        {
            return !this.isRegion() && this.begin == 0;
        }

        toString(): string
        {
            return "[" + this.begin + "," + this.end + "]";
        }
    }
}


module KeyCodes
{
    export enum KeyCode
    {
        Enter= 13,
        Home= 36,
        PageUp= 33,
        Delete= 46,
        End= 35,
        PageDown= 34,
        ArrowLeft= 37,
        ArrowUp= 38,
        ArrowRight= 39,
        ArrowDown= 40,
        BackSpace= 8
    }
}

module Utils
{
    export class StringUtility
    {
        static startWith(sourceStr: string, checkStr: string): boolean
        {
            if (sourceStr.length < checkStr.length) return false;
            for (var i = 0; i < checkStr.length; i++)
            {
                if (checkStr.charCodeAt(i) != sourceStr.charCodeAt(i)) return false;
            }
            return true;
        }

        static isEmpty(str: string): boolean
        {
            return str.length == 0 || (str.charCodeAt(0) == 0x0a && str.length == 1);
        }
    }
}