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

        //現在のカレット位置
        private _currentCaret:TextRegion=new TextRegion(0,0);

        //段落管理
        private _paragraphManager:ParagraphManager;

        //ペーストフラグ
        private _isPasted: boolean;
        //ペーストされた領域
        private _caretOnPaste: TextRegion;
        //ペースト直前のテキスト？
        private _lastTextOnPaste: string;
        //ペースト直前のカレット位置
        private _lastCaretOnPaste:TextRegion;

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

        //現在のカレット位置
        private get _caret():TextRegion
        {
            //return TextRegion.fromCaretInfo(this._editorTarget.caret());
            return this._currentCaret;
        }
        private set _caret(val: TextRegion)
        {
            if (!(this._currentCaret.begin == val.begin && this._currentCaret.end == val.end))
            {
                this._currentCaret = val;
                this._paragraphManager.changeCurrentParagraphByIndex(
                    this._paragraphManager.getCaretPositionAsParag(val.begin).paragraphIndex);
            }
        }

        //現在の編集文字列
        private get _text():string
        {
            return this._editorTarget.val();
        }

        pasteCommited()//ペースト直前に呼ばれるの？
        {
            this._isPasted = true;
            this._lastTextOnPaste = this._editorTarget.val();
            this._caretOnPaste = TextRegion.fromCaretInfo(this._editorTarget.caret());
            this._lastCaretOnPaste = this._caret;
        }

        textChanged()
        {
            if (this._isPasted)
            {
                var diffLength = this._editorTarget.val().length - this._lastTextOnPaste.length;//ペーストによる変化長？
                var difftext = this._editorTarget.val().substr(this._caretOnPaste.begin, diffLength);//変化した部分
                var pasteParag: Paragraph = this._paragraphManager.createParagraphFromText(difftext);//変化した部分を段落化
                //段落カレット位置取得
                var pos: CaretPosition = this._paragraphManager.getCaretPositionAsParag(this._lastCaretOnPaste.begin);

                //ペースト位置が段落の隙間なら、その隙間に挿入
                //段落の中なら、その位置で段落を二つに分けて、その間に挿入
                var frontParag: Paragraph;
                var backParag: Paragraph;
                if (pos.charIndex == 0)
                {
                    if (pos.paragraphIndex == 0)//先頭段落の先頭
                    {
                        frontParag = null;
                        backParag = this._paragraphManager.headParagraph;
                    }
                    else//先頭以外の段落の先頭
                    {
                        frontParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex - 1);
                        backParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex);
                    }
                }
                else
                {
                    var parag: Paragraph = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex);
                    if (pos.charIndex == parag.rawText.length)
                    {
                        if (pos.paragraphIndex == parag.getLastParagraph().getParagraphIndex())//末尾段落の末尾
                        {
                            frontParag = parag.getLastParagraph();
                            backParag = null;
                        }
                        else//末尾以外の段落の末尾
                        {
                            frontParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex);
                            backParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex + 1);
                        }
                    }
                    else//段落の中間
                    {
                        frontParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex).sepalateParagraph(pos.charIndex);
                        backParag = frontParag.nextParagraph;
                    }
                }
                if (frontParag == null)
                {
                    pasteParag.getLastParagraph().insertNext(backParag);
                }
                else
                {
                    frontParag.insertNext(pasteParag);
                }
                
                this._isPasted = false;
            }
        }

        //private _lastParagraphNumberSpan: JQuery;
        //private _pageFirstParagraph: Paragraph;
        //private _lastCaret: TextRegion;
        private _focusLine: string;
        //private _lastText: string;
        //private _lastTextOnKeyDown: string;
        //private _previewKeycode: number;
        //private _lastLnCount: number;



        //ここがキモなんだよねえ
        saveInput(event: JQueryKeyEventObject)
        {
            console.info("saveInput is Called...!");
            var caret: TextRegion = TextRegion.fromCaretInfo(this._editorTarget.caret());
            this._caret = caret;
            //if (!caret.isRegion() && !this._lastCaret.isRegion())
            //{
            //    if (event.keyCode == KeyCodes.KeyCode.Enter && this._editorTarget.val().charCodeAt(caret.begin - 1) == 0x0a)
            //    {
            //        if (caret.begin - 1 >= 0)
            //        {
            //            this._currentParagraph.setParagraphText(this._editorTarget.val(), caret.begin - 1);
            //        }
            //        this._currentParagraph.insertNext(new Paragraph(this));
            //        this.moveNext();
            //    }
            //    else if (_.include(NovelEditer._shiftCaretKeys, event.keyCode))
            //    {
            //        var lfc = this.countLf(this._lastText.substr(0, caret.begin));
            //        this.currentParagraphChanged(this._pageFirstParagraph.getParagraph(lfc));
            //        this.updateToshow();
            //    }
            //    else if (event.keyCode == KeyCodes.KeyCode.BackSpace && caret.begin != 0)
            //    {
            //        var c = this.countLf(this._lastTextOnKeyDown.substr(caret.begin, this._lastCaret.begin - caret.begin));
            //        if (c != 0)
            //        {
            //            console.warn("deleted range" + caret.begin + "," + this._lastCaret.begin + "lfc:" + c);
            //            var pCache: Paragraph = this._currentParagraph;
            //            this.currentParagraphChanged(this._currentParagraph.getParagraph(-c));
            //            pCache.removeRange(-c + 1);
            //        }
            //    }
            //    else if (event.keyCode == KeyCodes.KeyCode.Delete)
            //    {
            //        var delCount = this._lastTextOnKeyDown.length - this._editorTarget.val().length; //文字列の長さからデリーとされた文字列の長さを考える。
            //        var lnc2 = this.countLf(this._lastTextOnKeyDown.substr(caret.begin, delCount));
            //        if (lnc2 != 0)
            //        {
            //            this._currentParagraph.nextParagraph.removeRange(lnc2 - 1);
            //        }
            //    }
            //}
            //this._currentParagraph.setParagraphText(this._editorTarget.val(), caret.begin);
            //this.updateToshow();
            //this._lastCaret = caret;
            //this._lastText = this._editorTarget.val();
            //this._lastTextOnKeyDown = this._lastText;
        }

        updateToshow()
        {
            //var i: number = 1;
            //while (i <= this._paragraphManager.lastParagraphIndex + 1)
            //{
            //    this._previewTarget.html(this._pageFirstParagraph.getParagraphHtmls(i));
            //    if (this._previewTarget.width() > this._previewBounds.width())
            //    {
            //        this._previewTarget.html(this._pageFirstParagraph.getParagraphHtmls(i - 1));
            //        break;
            //    }
            //    i++;
            //}
        }



        private _calcFocusRegion(text: string, selectionBegin: number, selectionEnd: number): TextRegion
        {
            var length: number = text.length;
            var end = selectionEnd, begin = selectionBegin;
            if (!_.include(NovelEditer._endOfLineChar, text.substr(end, 1)))
                for (var i = selectionEnd; i < length; i++)
                {
                    end = i + 1;
                    if (_.include(NovelEditer._endOfLineChar, text.substr(end, 1))) break;
                }
            for (i = selectionBegin; i >= 0; i--)
            {
                begin = i;
                if (i == 0 || _.include(NovelEditer._endOfLineChar, text.substr(i - 1, 1))) break;
            }
            return new TextRegion(begin, end);
        }

        updateFocusLine(): void
        {
            var currentText: string = this._editorTarget.val();
            var caret: CaretInfo = this._editorTarget.caret();
            var region = this._calcFocusRegion(currentText, caret.begin, caret.end);
            this._focusLine = region.substr(currentText);
            console.warn("focusLine:" + this._focusLine);
        }

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
            this._caret = caret;
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
        get currentParagraph(): Paragraph
        {
            return this._currentParagraph;
        }

        //段落数
        get paragraphCount(): number
        {
            return this._lastParagraphIndex + 1;
        }
        get isEmpty(): boolean
        {
            return this.paragraphCount == 0;
        }

        //現在の段落(とその強調表示)を変更する
        changeCurrentParagraph(currentParagraph: Paragraph)
        {
            this._currentParagraph.isEmphasized = false;
            this._currentParagraph = currentParagraph;
            this._currentParagraph.isEmphasized = true;
            console.info("currentParagraph:" + currentParagraph.rawText);
        }
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
                caretPos = caretPos - parag.rawText.length - 1;
                paragPos = paragPos + 1;
                parag = parag.nextParagraph;
            }
            return new CaretPosition(paragPos, caretPos);
        }
    }

    export class Paragraph implements IParagraph
    {
        //マークアップ付の生テキスト
        private _rawText: string;
        //段落管理クラス
        private _manager: ParagraphManager;
        //前の段落
        private _prevParagraph: Paragraph;
        //次の段落
        private _nextParagraph: Paragraph;
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
            return this._prevParagraph;
        }

        getNextParagraph(): IParagraph
        {
            return this._nextParagraph;
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

        set rawText(raw: string)
        {
            this._rawText = raw;
            this.updateCacheHtml();
        }
        get nextParagraph(): Paragraph//諸事情で追加
        {
            return this._nextParagraph;
        }
        get prevParagraph(): Paragraph//諸事情で追加
        {
            return this._prevParagraph;
        }

        //これが最終段落か否か
        get isFinalParagraph(): boolean
        {
            return this._nextParagraph == null;
        }

        //これが最初の段落か否か
        get isFirstParagraph(): boolean
        {
            return this._prevParagraph == null;
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
            if (this._prevParagraph != null)
            {
                this._paragraphIndex = this._prevParagraph._paragraphIndex + 1;
            }
            else
            {
                this._paragraphIndex = 0;
            }
            if (!this.isFinalParagraph) this._nextParagraph.updateParagraphIndex();
            else this._manager.lastParagraphIndex = this._paragraphIndex;
        }

        //指定した段落をこの段落の直後に挿入
        insertNext(next: Paragraph)
        {
            if (!this.isFinalParagraph)
            {
                var last: Paragraph = next.getLastParagraph();
                last._nextParagraph = this._nextParagraph;
                this._nextParagraph._prevParagraph = last;
            }
            next._prevParagraph = this;
            this._nextParagraph = next;
            next.updateParagraphIndex();
        }
         //指定した段落をこの段落の直前に挿入
        insertPrev(prev: Paragraph)
        {
            if (!this.isFirstParagraph)
            {
                prev._prevParagraph = this._prevParagraph;
                this._prevParagraph._nextParagraph = prev;
            }
            var last: Paragraph = prev.getLastParagraph();
            last._nextParagraph = this;
            this._prevParagraph = last;
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
                parag = parag._nextParagraph;
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
                parag = parag._prevParagraph;
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
                this._prevParagraph._nextParagraph = null;
                return;
            }
            if (this.isFirstParagraph)
            {
                this._nextParagraph._prevParagraph = null;
                this.nextParagraph.updateParagraphIndex();
                return;
            }
            else
            {
                this.prevParagraph.insertNext(this.nextParagraph);
            }
        }
        //この段落の指定した位置で、この段落を二つの段落に分ける。分けた前半の段落を返す
        sepalateParagraph(pos: number):Paragraph
        {
            var front: Paragraph = new Paragraph(this._manager, this._rawText.substr(0, pos));
            var back: Paragraph = new Paragraph(this._manager, this._rawText.substr(pos, this._rawText.length - pos));

            front._nextParagraph = back;
            back._prevParagraph = front;
            if (!this.isFinalParagraph)
            {
                back._nextParagraph = this._nextParagraph;
                this._nextParagraph._prevParagraph = back;
            }
            if (!this.isFirstParagraph)
            {
                this._prevParagraph.insertNext(front);
                return front;
            }
            front.updateParagraphIndex();
            return front;
        }

        toString(): string
        {
            return this.rawText;
        }
    }

//    //段落クラス
//    export class Paragraph
//    {


////自分を含めて指定したインデックス番目まで削除します。
//        removeRange(index: number)
//        {
//            var cp: Paragraph = this;
//            var cp2: Paragraph;
//            if (index < 0)
//            {
//                index--; //自分自身の削除を入れるため
//                while (index != 0 && !cp.isFirstParagraph)
//                {
//                    cp2 = cp.prevParagraph;
//                    cp.removeThis();
//                    cp = cp2;
//                    index++;
//                }
//            }
//            else if (index > 0)
//            {
//                index++;
//                while (index != 0 && !cp.isFinalParagraph)
//                {
//                    cp2 = cp.nextParagraph;
//                    cp.removeThis();
//                    cp = cp2;
//                    index--;
//                }
//            }
//            else
//            {
//                this.removeThis();
//            }
//        }





//    }

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