var editorInstance: NovelEditer.NovelEditer;
$(() => {
    
    editorInstance = new NovelEditer.NovelEditer($(".edit-context"), $(".preview-body"),$(".preview-context"));
    editorInstance.createEmpty();
    editorInstance.updateToshow();
    editPage.onChanged();
});

module NovelEditer
{
    export class NovelEditer {
        private static _endOfLineChar: string[] = ["\n"];
        private static _shiftCaretKeys:number[]=[KeyCodes.KeyCode.ArrowRight,KeyCodes.KeyCode.ArrowLeft,KeyCodes.KeyCode.ArrowDown,KeyCodes.KeyCode.ArrowUp];
         private _editorTarget: JQuery;
        private _previewTarget: JQuery;
        private _previewBounds: JQuery;
        private _lastParagraphNumberSpan:JQuery;
        private _currentParagraph: Paragraph;
        private _pageFirstParagraph:Paragraph;
        private _lastCaret: TextRegion;
        private _caretOnPaste:TextRegion;
        private _focusLine: string;
        private _lastText: string;
        private _lastTextOnKeyDown: string;
        private _lastTextOnPaste:string;
        private _previewKeycode: number;
        private _isPasted: boolean;
        private _lastLnCount: number;
        private _lastParagraphIndex: number;

        public get LastParagraphIndex() {
            return this._lastParagraphIndex;
        }

        public set LastParagraphIndex(val: number) {
            this._lastParagraphIndex = val;
        }
        constructor(editorTarget: JQuery, previewTarget: JQuery, previewBounds: JQuery) {
            this._previewBounds = previewBounds;
             this._editorTarget = editorTarget;
             this._previewTarget = previewTarget;
             this._editorTarget.keypress((event: JQueryKeyEventObject) => this.inputCommited(event));
            this._editorTarget.keyup((event: JQueryKeyEventObject) => this.saveInput(event));
             //マウスによってキャレットが移動した際は位置を保存しておく
             this._editorTarget.mousedown(() => this.mouseHandler());
            this._editorTarget.mouseup(() => this.mouseHandler());
            this._editorTarget.bind('paste', () => this.pasteCommited());
            this._editorTarget.bind('input propertychange', () => this.textChanged());
             //this._editorTarget.mousemove(() => this.recordLastCaret());
             this._lastCaret = new TextRegion(0, 0);
             this._lastText = this._editorTarget.val();
         }

         //最後のキャレットの位置を保存する
         recordLastCaret() {
             this._lastCaret = TextRegion.fromCaretInfo(this._editorTarget.caret());
             this._lastText = this._editorTarget.val();
             console.warn("lastCaret updated:" + this._lastCaret.toString());
         }
        //現在のパラグラフを次に移動する
        moveNext() {
            this.currentParagraphChanged(this._currentParagraph.nextParagraph);
        }

        movePrev() {
            this.currentParagraphChanged(this._currentParagraph.prevParagraph);
        }

         //何らかの入力がなされた場合
        inputCommited(event: JQueryKeyEventObject) {
            this.recordLastCaret();
            this._lastText = this._editorTarget.val();
        }

        //ここがキモなんだよねえ
        saveInput(event: JQueryKeyEventObject) {
            var caret: TextRegion = TextRegion.fromCaretInfo(this._editorTarget.caret());
            if (!caret.isRegion() && !this._lastCaret.isRegion()) {
                if (event.keyCode == KeyCodes.KeyCode.Enter && this._editorTarget.val().charCodeAt(caret.begin - 1) == 0x0a) {
                    if (caret.begin - 1 >= 0) {
                        this._currentParagraph.setParagraphText(this._editorTarget.val(), caret.begin - 1);
                    }
                    this._currentParagraph.insertNext(new Paragraph(this));
                    this.moveNext();
                } else if(_.include(NovelEditer._shiftCaretKeys,event.keyCode)) {
                    var lfc = this.countLf(this._lastText.substr(0, caret.begin));
                    this.currentParagraphChanged(this._pageFirstParagraph.getParagraph(lfc));
                    this.updateToshow();
                } else if (event.keyCode == KeyCodes.KeyCode.BackSpace && caret.begin != 0) {
                    var c = this.countLf(this._lastTextOnKeyDown.substr(caret.begin,this._lastCaret.begin-caret.begin));
                    if (c != 0) {
                        console.warn("deleted range" + caret.begin + "," + this._lastCaret.begin + "lfc:" + c);
                        var pCache: Paragraph = this._currentParagraph;
                        this.currentParagraphChanged(this._currentParagraph.getParagraph(-c));
                        pCache.removeRange(-c + 1);
                    }
                } else if (event.keyCode == KeyCodes.KeyCode.Delete) {
                    var delCount = this._lastTextOnKeyDown.length - this._editorTarget.val().length;//文字列の長さからデリーとされた文字列の長さを考える。
                    var lnc2 = this.countLf(this._lastTextOnKeyDown.substr(caret.begin, delCount));
                    if (lnc2 != 0) {
                        this._currentParagraph.nextParagraph.removeRange(lnc2 - 1);
                    }
                }
            }
            this._currentParagraph.setParagraphText(this._editorTarget.val(), caret.begin);
            this.updateToshow();
            this._lastCaret = caret;
            this._lastText = this._editorTarget.val();
            this._lastTextOnKeyDown = this._lastText;
        }

         createEmpty() {
             this._currentParagraph = new Paragraph(this);
             this._pageFirstParagraph = this._currentParagraph;
             this._currentParagraph.isEmphasized = true;
         }

        updateToshow() {
            var i: number = 1;
            while (i<=this.LastParagraphIndex+1) {
                this._previewTarget.html(this._pageFirstParagraph.getParagraphHtmls(i));
                if (this._previewTarget.width() > this._previewBounds.width()) {
                    this._previewTarget.html(this._pageFirstParagraph.getParagraphHtmls(i - 1));
                    break;
                }
                i++;
            }
             
         }

        //変更された場合true、同じならfalse
        currentParagraphChanged(currentParagraph: Paragraph):boolean {
            if (this._currentParagraph == currentParagraph)return false;
            this._currentParagraph.isEmphasized = false;
            this._currentParagraph = currentParagraph;
            this._currentParagraph.isEmphasized = true;
            console.info("currentParagraph:" + currentParagraph.rawText);
            return true;
        }

        private  _calcFocusRegion(text: string, selectionBegin: number, selectionEnd: number): TextRegion {
             var length: number = text.length;
             var end = selectionEnd, begin = selectionBegin;
             if (!_.include(NovelEditer._endOfLineChar, text.substr(end, 1)))
                 for (var i = selectionEnd; i < length; i++) {
                     end = i + 1;
                     if (_.include(NovelEditer._endOfLineChar, text.substr(end, 1))) break;
                 }
             for (i = selectionBegin; i >= 0; i--) {
                 begin = i;
                 if (i == 0 || _.include(NovelEditer._endOfLineChar, text.substr(i - 1, 1))) break;
             }
             return new TextRegion(begin, end);

         }

         updateFocusLine(): void {
             var currentText: string = this._editorTarget.val();
             var caret: CaretInfo = this._editorTarget.caret();
             var region = this._calcFocusRegion(currentText, caret.begin, caret.end);
             this._focusLine = region.substr(currentText);
             console.warn("focusLine:" + this._focusLine);
         }
        //改行の数をカウントする
        countLf(str: string): number {
            var count = 0;
            for (var i = 0; i < str.length; i++) {
                if (str.charCodeAt(i) == 0x0a) {
                    count++;
                }
            }
            return count;
        }

        mouseHandler() {
            this.recordLastCaret();
            this.updateFocusLine();
            var region=TextRegion.fromCaretInfo(this._editorTarget.caret());
            if (!region.isRegion()) {
                var lfc=this.countLf(this._lastText.substr(0, region.begin));
                this.currentParagraphChanged(this._pageFirstParagraph.getParagraph(lfc));
                this.updateToshow();
            }
        }

        pasteCommited() {
            this._isPasted = true;
            this._lastTextOnPaste = this._editorTarget.val();
            this._caretOnPaste = TextRegion.fromCaretInfo(this._editorTarget.caret());
        }

        textChanged() {
            if (this._isPasted) {
                this._isPasted = false;
                var diffLength = this._editorTarget.val().length - this._lastTextOnPaste.length;
                var difftext = this._editorTarget.val().substr(this._caretOnPaste.begin, diffLength);
                this._currentParagraph.setParagraphText(this._editorTarget.val(), this._caretOnPaste.begin);
                this.currentParagraphChanged(this._currentParagraph.insertTextToAfter(difftext));
            }
        }
    }

    export class Page {
          
    }

    //段落クラス
    export class Paragraph {
        private _isEmphasized: boolean = false;
        set isEmphasized(isem: boolean) {
            this._isEmphasized = isem;
            this.updateCacheHtml();
        }
        get isEmphasized(): boolean {
            return this._isEmphasized;
        }
        static createInstance(editer: NovelEditer, rawText: string) {
            var instance = new Paragraph(editer);
            instance.rawText = rawText;
            return instance;
        }

        private paragraphIndex: number=0;

        public get ParagraphIndex() {
            return this.paragraphIndex;
        }

        updateParagraphIndex() {
            if (this.prevParagraph != null) {
                this.paragraphIndex = this.prevParagraph.paragraphIndex + 1;
            } else {
                this.paragraphIndex = 0;
            }
            this.updateCacheHtml();
            if (!this.isFinalParagraph) this.nextParagraph.updateParagraphIndex();
            if (this.isFinalParagraph)this._editer.LastParagraphIndex = this.paragraphIndex;
        }
        private _calculatedWidth:number=0;
        private _editer: NovelEditer;
        constructor(editer: NovelEditer) {
            this._editer = editer;
            this.rawText = "";
            this.updateCacheHtml();
        }
        //次の段落
         private _nextParagraph:Paragraph;
        get nextParagraph(): Paragraph {
             return this._nextParagraph;
         }
        set nextParagraph(next: Paragraph) {
            if (next == null && !this.isFinalParagraph)this.nextParagraph._prevParagraph = null;//次を消した場合は次のノードであったものから前のノードを消す
            this._nextParagraph = next;
            if (next!=null&&next.prevParagraph != this) next.prevParagraph = this;//次のパラグラフの前のパラグラフが自分自身でないなら付け替える。
        }
        //一つ前の段落
        private _prevParagraph: Paragraph;
        get prevParagraph(): Paragraph {
            return this._prevParagraph;
        }
        set prevParagraph(prev: Paragraph) {
            if (prev == null && !this.isFirstParagraph)this.prevParagraph._nextParagraph = null;
            this._prevParagraph = prev;
            if (prev != null && prev.nextParagraph != this) prev.nextParagraph = this;//前のパラグラフの次のパラグラフが自分自身でないなら付け替える。   
            this.updateParagraphIndex();
        }
        //これが最終段落か否か
        get isFinalParagraph(): boolean {
            return this._nextParagraph == null;
        }
        //これが最初の段落か否か
        get isFirstParagraph(): boolean {
            return this._prevParagraph == null;
        }
        //生のテキスト
        private _rawText: string;
        get rawText(): string {
            return this.paragraphIndex+this._rawText;
        }
        set rawText(raw: string) {
            this._rawText = raw;
            this.updateCacheHtml();
        }
        
        private _cacheHtml:string;
        get html(): string {
            return this._cacheHtml;
        }

        //この段落を削除する
        removeThis() {
            if (this.isFinalParagraph || this.isFirstParagraph) {
                if (this.isFinalParagraph) {
                    this.prevParagraph.nextParagraph = null;
                }
                return; //最終パラグラフもしくは最初のパラグラフなら必要ないのでそのままリターン
            } else {
                this.prevParagraph.nextParagraph = this.nextParagraph;
            }    
        }
        //自分を含めて指定したインデックス番目まで削除します。
        removeRange(index:number) {
            var cp: Paragraph = this;
            var cp2: Paragraph;
            if (index < 0) {
                index--;//自分自身の削除を入れるため
                while (index != 0&&!cp.isFirstParagraph) {
                    cp2 = cp.prevParagraph;
                    cp.removeThis();
                    cp = cp2;
                    index++;
                }
            }else if (index > 0) {
                index++;
                while (index != 0&&!cp.isFinalParagraph) {
                    cp2 = cp.nextParagraph;
                    cp.removeThis();
                    cp = cp2;
                    index--;
                }
            } else {
                this.removeThis();
            }
        }
        //このパラグラフに挿入されたテキスト(改行を含む)を改行で分割してパラグラフに分ける。最終パラグラフを返す
        insertTextToAfter(str:string):Paragraph {
            var num:number=str.indexOf("\n");
            var subStr: string = str.substr(num+1, str.length - num-1);
            if (subStr.length == 0||num==-1) return this;
            var paragpraph: Paragraph = new Paragraph(this._editer);
            var newParagraph: Paragraph;
            this.insertNext(paragpraph);
            while (true) {
                paragpraph.setParagraphText(subStr, 0);
                num =subStr.indexOf("\n");
                if (num == -1) {
                    break;
                }
                subStr =subStr.substr(num+1, subStr.length - num-1);
                if (subStr.length == 0) break;
                newParagraph = new Paragraph(this._editer);
                paragpraph.insertNext(newParagraph);
                paragpraph = newParagraph;
            }
            return paragpraph;
        }

        insertNext(next:Paragraph) {
                var p = this.nextParagraph;
                this.nextParagraph = next;
                next.nextParagraph = p;
        }

        //このパラグラフから指定番目を取得する
        getParagraph(dist: number): Paragraph {
            var currentParagraph: Paragraph = this;
            while (dist!=0)
            {
                if (dist < 0) {
                    if (currentParagraph.prevParagraph == null) currentParagraph.prevParagraph = new Paragraph(this._editer);//存在しない場合は付け加える
                    currentParagraph = currentParagraph.prevParagraph;
                } else {
                if (currentParagraph.nextParagraph == null) currentParagraph.nextParagraph = new Paragraph(this._editer);
                    currentParagraph = currentParagraph.nextParagraph;
                }
                dist += dist < 0 ? 1 : -1;
            }
            return currentParagraph;
        }


        //指定した番目までの段落のhtmlを結合して返す。
        getParagraphHtmls(count: number): string {
            var cachedHtml: string = this.html;
            var currentParagraph: Paragraph = this;
            //JSだと再帰でやるとすぐにメモリ無くなるのでforでやる
            for (var i = 0; i < count&&!currentParagraph.isFinalParagraph; i++) {
                currentParagraph = currentParagraph.nextParagraph;
                cachedHtml += currentParagraph.html;
            }
            return cachedHtml;
        }

        getParagraphRawTexts(count: number): string {
            var cachedRawText: string = this.rawText;
            var currentParagraph: Paragraph = this;
            //JSだと再帰でやるとすぐにメモリ無くなるのでforでやる
            for (var i = 0; i < count && !currentParagraph.isFinalParagraph; i++) {
                currentParagraph = currentParagraph.nextParagraph;
                cachedRawText += currentParagraph.rawText;
            }
            return cachedRawText;
        }

        countParagraph(max:number): number {
            var cacheParagraph: Paragraph = this;
            var count: number = 0;
            for (var i = 0; i < max; i++) {
                if(cacheParagraph.isFinalParagraph)break;
                count++;
                cacheParagraph = cacheParagraph.nextParagraph;
            }
            return count;
        }

        //指定した文字列のcharIndex番目がこのパラグラフ内に存在するとしてこのパラグラフを構成します。
        setParagraphText(str: string, charIndex: number) {
            var begin: number = charIndex;
            var end: number = charIndex;
            for (var i = charIndex; i <= str.length; i++) {
                end = i;
                if(str.charCodeAt(i)==0x0a)break;
            }
            for (var j = charIndex;j>=0;j--) {
                begin = j;
                if(j==0||str.charCodeAt(j-1)==0x0a)break;
            }
            this.rawText = str.substr(begin, end - begin);
        }

        toString(): string {
            return this.rawText;
        }

        private updateCalculatedWidth() {
            this._calculatedWidth = $(this._cacheHtml).width();
            console.warn(this._calculatedWidth + "pixel:" + this._cacheHtml);
        }

        updateCacheHtml() {
            var prefixes: any[] = [new TitlePrefix(), new DividerPrefix()];
            var tag: JQuery;
            var rawStr: string = this.rawText;
            rawStr.replace(" ", "&ensp;");//半角スペースは特殊文字として置き換える
            if (Utils.StringUtility.isEmpty(this.rawText)) {
                this._cacheHtml = "<br/>";
                this.updateCalculatedWidth();
                return;
            }
            var isPrefixed: boolean = false;
            for (var i = 0; i < prefixes.length; i++) {
                if (prefixes[i].isPrefixOfMe(rawStr)) {
                    tag=$(prefixes[i].getFormattedHtml(rawStr));
                    isPrefixed = true;
                    break;
                }
            }
            if(!isPrefixed) {
                tag = $("<p/>");
                //エスケープ処理
                if (rawStr.charCodeAt(0) == 0x5c && rawStr.length > 1 && rawStr.charCodeAt(1) == 0x5c) rawStr = "\\" + rawStr.substr(2, rawStr.length - 2);//\\の場合は\にする
                else if(rawStr.charCodeAt(0)==0x5c&&rawStr.charCodeAt(1)!=0x5c) {
                    rawStr=rawStr.substr(1, rawStr.length - 1);
                }

                tag.html(rawStr);
            }
            tag.addClass("p-" + this.paragraphIndex);
            if (this.isEmphasized) tag.addClass("em");
            this._cacheHtml = $("<div/>").append(tag).html();
            this.updateCalculatedWidth();
        }
    }
    
    class PrefixBase {

        isPrefixOfMe(str: string): boolean {
            if (str.charCodeAt(0) == 0x5c) return false;//最初が\のときエスケープする
            if (Utils.StringUtility.startWith(str, this.getPrefixString())) return true;
            return false;
        }

        getPrefixString(): string {
            return "Not Implemented!";
        }

        getFormattedHtml(str: string): string {
            var preLength: number = this.getPrefixString().length;
            return this.getFormattedHtmlImpl(str.substr(preLength, str.length - preLength));
        }

        getFormattedHtmlImpl(str: string): string {
            return "Not Implemented!";
        }
    }

    class TitlePrefix extends PrefixBase{
        getPrefixString(): string {
            return "#";
        }

        getFormattedHtmlImpl(str:string): string {
            return "<h1>" + str + "</h1>";
        }
    }
    class DividerPrefix extends PrefixBase {
        getPrefixString(): string {
            return "-";
        }

        getFormattedHtmlImpl(str: string): string {
            return "<hr/>";
        }
    }

    //テキストの選択領域を表すクラス
    class TextRegion {
        public static fromCaretInfo(caret: CaretInfo): TextRegion {
            return new TextRegion(caret.begin, caret.end);
        }
        constructor(begin: number, end: number) {
            this.begin = begin;
            this.end = end;
        }
        begin: number;
        end: number;
        public substr(text: string): string {
            return text.substr(this.begin, this.end - this.begin);
        }
        public isRegion(): boolean {
            return this.begin != this.end;
        }

        public isFirst(): boolean {
            return !this.isRegion() && this.begin == 0;
        }

        toString(): string {
            return "[" + this.begin + "," + this.end + "]";
        }

    }
 }


module KeyCodes {
    export enum KeyCode {
        Enter= 13,
        Home= 36,
        PageUp= 33,
        Delete= 46,
        End= 35,
        PageDown= 34,
        ArrowLeft= 37,
        ArrowUp= 38,
        ArrowRight= 39,
        ArrowDown=40,
        BackSpace=8
    }
}

module Utils {
    export class StringUtility {
        static startWith(sourceStr: string, checkStr: string):boolean {
            if (sourceStr.length < checkStr.length) return false;
            for (var i = 0; i < checkStr.length; i++) {
                if (checkStr.charCodeAt(i) != sourceStr.charCodeAt(i))return false;
            }
            return true;
        }

        static isEmpty(str: string): boolean {
            return str.length == 0 || (str.charCodeAt(0) == 0x0a&&str.length==1);
        }
    }
}
