var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var editorInstance;
$(function () {
    editorInstance = new NovelEditer.NovelEditer($(".edit-context"), $(".preview-body"), $(".preview-context"));
    editorInstance.updateToshow();
    editPage.onChanged();
});

var NovelEditer;
(function (_NovelEditer) {
    var NovelEditer = (function () {
        function NovelEditer(editorTarget, previewTarget, previewBounds) {
            var _this = this;
            //現在のカレット位置
            this._currentCaret = new TextRegion(0, 0);
            this._previewBounds = previewBounds;
            this._editorTarget = editorTarget;
            this._previewTarget = previewTarget;
            this._editorTarget.keyup(function (event) {
                return _this.saveInput(event);
            });

            //マウスによってキャレットが移動した際は位置を保存しておく
            //this._editorTarget.mousedown(() => this.mouseHandler());
            this._editorTarget.mouseup(function () {
                return _this.mouseHandler();
            });
            this._editorTarget.bind('paste', function () {
                return _this.pasteCommited();
            });
            this._editorTarget.bind('input propertychange', function () {
                return _this.textChanged();
            });
            this._paragraphManager = new ParagraphManager();
        }
        Object.defineProperty(NovelEditer.prototype, "_caret", {
            //現在のカレット位置
            get: function () {
                //return TextRegion.fromCaretInfo(this._editorTarget.caret());
                return this._currentCaret;
            },
            set: function (val) {
                if (!(this._currentCaret.begin == val.begin && this._currentCaret.end == val.end)) {
                    this._currentCaret = val;
                    this._paragraphManager.changeCurrentParagraphByIndex(this._paragraphManager.getCaretPositionAsParag(val.begin).paragraphIndex);
                }
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(NovelEditer.prototype, "_text", {
            //現在の編集文字列
            get: function () {
                return this._editorTarget.val();
            },
            enumerable: true,
            configurable: true
        });

        NovelEditer.prototype.pasteCommited = function () {
            this._isPasted = true;
            this._lastTextOnPaste = this._editorTarget.val();
            this._caretOnPaste = TextRegion.fromCaretInfo(this._editorTarget.caret());
            this._lastCaretOnPaste = this._caret;
        };

        NovelEditer.prototype.textChanged = function () {
            if (this._isPasted) {
                var diffLength = this._editorTarget.val().length - this._lastTextOnPaste.length;
                var difftext = this._editorTarget.val().substr(this._caretOnPaste.begin, diffLength);
                var pasteParag = this._paragraphManager.createParagraphFromText(difftext);

                //段落カレット位置取得
                var pos = this._paragraphManager.getCaretPositionAsParag(this._lastCaretOnPaste.begin);

                //ペースト位置が段落の隙間なら、その隙間に挿入
                //段落の中なら、その位置で段落を二つに分けて、その間に挿入
                var frontParag;
                var backParag;
                if (pos.charIndex == 0) {
                    if (pos.paragraphIndex == 0) {
                        frontParag = null;
                        backParag = this._paragraphManager.headParagraph;
                    } else {
                        frontParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex - 1);
                        backParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex);
                    }
                } else {
                    var parag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex);
                    if (pos.charIndex == parag.rawText.length) {
                        if (pos.paragraphIndex == parag.getLastParagraph().getParagraphIndex()) {
                            frontParag = parag.getLastParagraph();
                            backParag = null;
                        } else {
                            frontParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex);
                            backParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex + 1);
                        }
                    } else {
                        frontParag = this._paragraphManager.getParagraphByIndex(pos.paragraphIndex).sepalateParagraph(pos.charIndex);
                        backParag = frontParag.nextParagraph;
                    }
                }
                if (frontParag == null) {
                    pasteParag.getLastParagraph().insertNext(backParag);
                } else {
                    frontParag.insertNext(pasteParag);
                }

                this._isPasted = false;
            }
        };

        //private _lastText: string;
        //private _lastTextOnKeyDown: string;
        //private _previewKeycode: number;
        //private _lastLnCount: number;
        //ここがキモなんだよねえ
        NovelEditer.prototype.saveInput = function (event) {
            console.info("saveInput is Called...!");
            var caret = TextRegion.fromCaretInfo(this._editorTarget.caret());
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
        };

        NovelEditer.prototype.updateToshow = function () {
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
        };

        NovelEditer.prototype._calcFocusRegion = function (text, selectionBegin, selectionEnd) {
            var length = text.length;
            var end = selectionEnd, begin = selectionBegin;
            if (!_.include(NovelEditer._endOfLineChar, text.substr(end, 1)))
                for (var i = selectionEnd; i < length; i++) {
                    end = i + 1;
                    if (_.include(NovelEditer._endOfLineChar, text.substr(end, 1)))
                        break;
                }
            for (i = selectionBegin; i >= 0; i--) {
                begin = i;
                if (i == 0 || _.include(NovelEditer._endOfLineChar, text.substr(i - 1, 1)))
                    break;
            }
            return new TextRegion(begin, end);
        };

        NovelEditer.prototype.updateFocusLine = function () {
            var currentText = this._editorTarget.val();
            var caret = this._editorTarget.caret();
            var region = this._calcFocusRegion(currentText, caret.begin, caret.end);
            this._focusLine = region.substr(currentText);
            console.warn("focusLine:" + this._focusLine);
        };

        //改行の数をカウントする
        NovelEditer.prototype.countLf = function (str) {
            var count = 0;
            for (var i = 0; i < str.length; i++) {
                if (str.charCodeAt(i) == 0x0a) {
                    count++;
                }
            }
            return count;
        };

        NovelEditer.prototype.mouseHandler = function () {
            console.info("mouseHandler is Called...!");
            var caret = TextRegion.fromCaretInfo(this._editorTarget.caret());
            this._caret = caret;
            //this.updateFocusLine();
            //var region = TextRegion.fromCaretInfo(this._editorTarget.caret());
            //if (!region.isRegion())
            //{
            //    var lfc = this.countLf(this._lastText.substr(0, region.begin));
            //    this.currentParagraphChanged(this._pageFirstParagraph.getParagraph(lfc));
            //    this.updateToshow();
            //}
        };
        NovelEditer._endOfLineChar = ["\n"];
        NovelEditer._shiftCaretKeys = [39 /* ArrowRight */, 37 /* ArrowLeft */, 40 /* ArrowDown */, 38 /* ArrowUp */];
        return NovelEditer;
    })();
    _NovelEditer.NovelEditer = NovelEditer;
    var ParagraphManager = (function () {
        function ParagraphManager() {
            //最終段落のインデックス
            this._lastParagraphIndex = 0;
        }
        Object.defineProperty(ParagraphManager.prototype, "lastParagraphIndex", {
            get: function () {
                return this._lastParagraphIndex;
            },
            set: function (index) {
                this._lastParagraphIndex = index;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ParagraphManager.prototype, "headParagraph", {
            get: function () {
                return this._headParagraph;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ParagraphManager.prototype, "currentParagraph", {
            get: function () {
                return this._currentParagraph;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(ParagraphManager.prototype, "paragraphCount", {
            //段落数
            get: function () {
                return this._lastParagraphIndex + 1;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ParagraphManager.prototype, "isEmpty", {
            get: function () {
                return this.paragraphCount == 0;
            },
            enumerable: true,
            configurable: true
        });

        //現在の段落(とその強調表示)を変更する
        ParagraphManager.prototype.changeCurrentParagraph = function (currentParagraph) {
            this._currentParagraph.isEmphasized = false;
            this._currentParagraph = currentParagraph;
            this._currentParagraph.isEmphasized = true;
            console.info("currentParagraph:" + currentParagraph.rawText);
        };
        ParagraphManager.prototype.changeCurrentParagraphByIndex = function (paragraphIndex) {
            var parag = this._currentParagraph.getParagraphByIndex(paragraphIndex);
            this.changeCurrentParagraph(parag);
        };

        //現在のパラグラフを次に移動する。現在が末尾だったら何もせずfalse
        ParagraphManager.prototype.moveNext = function () {
            if (this._currentParagraph.isFinalParagraph)
                return false;
            this.changeCurrentParagraph(this._currentParagraph.nextParagraph);
            return true;
        };

        //現在のパラグラフを前に移動する。現在が先頭だったら何もせずfalse
        ParagraphManager.prototype.movePrev = function () {
            if (this._currentParagraph.isFirstParagraph)
                return false;
            this.changeCurrentParagraph(this._currentParagraph.prevParagraph);
            return true;
        };

        //末尾に段落を追加する
        ParagraphManager.prototype.addParagraph = function (parag) {
            if (this._lastParagraphIndex == 0) {
                this._headParagraph = parag;
                this._currentParagraph = parag;
                parag.updateParagraphIndex();
                return;
            }
            this._currentParagraph.getLastParagraph().insertNext(parag);
        };

        //指定したインデックスの段落を取得
        ParagraphManager.prototype.getParagraphByIndex = function (index) {
            return this._headParagraph.getParagraphByIndex(index);
        };

        //テキストを改行で分割してパラグラフに分ける。先頭を返す
        ParagraphManager.prototype.createParagraphFromText = function (str) {
            while (str.substr(str.length - 1, 1) == "\n") {
                str = str.substr(0, str.length - 1);
            }
            var num = str.indexOf("\n");
            if (num == -1)
                return new Paragraph(this, str);

            var parag = new Paragraph(this, str.substr(0, num));
            str = str.substr(num + 1, str.length - num - 1); //改行の後ろ

            while (str.length != 0) {
                num = str.indexOf("\n"); //改行を探す
                if (num == -1) {
                    parag.insertNext(new Paragraph(this, str));
                    return parag.getFirstParagraph();
                }
                parag.insertNext(new Paragraph(this, str.substr(0, num)));
                parag = parag.nextParagraph;
                str = str.substr(num + 1, str.length - num - 1); //改行の後ろ
            }
            return parag.getFirstParagraph();
        };

        //指定したカレット位置を段落上のカレット位置に変換する
        ParagraphManager.prototype.getCaretPositionAsParag = function (caretPos) {
            var parag = this._headParagraph;
            var paragPos = 0;
            while (parag.rawText.length < caretPos) {
                caretPos = caretPos - parag.rawText.length - 1;
                paragPos = paragPos + 1;
                parag = parag.nextParagraph;
            }
            return new CaretPosition(paragPos, caretPos);
        };
        return ParagraphManager;
    })();
    _NovelEditer.ParagraphManager = ParagraphManager;

    var Paragraph = (function () {
        function Paragraph(manager, rawText) {
            //段落番号(先頭は0)
            this._paragraphIndex = 0;
            //強調表示フラグ
            this._isEmphasized = false;
            this._manager = manager;
            this._rawText = rawText;
            this.updateCacheHtml();
        }
        Paragraph.prototype.getPrevParagraph = function () {
            return this._prevParagraph;
        };

        Paragraph.prototype.getNextParagraph = function () {
            return this._nextParagraph;
        };

        Paragraph.prototype.getCachedHtml = function () {
            return this._cacheHtml;
        };

        Paragraph.prototype.getParagraphIndex = function () {
            return this._paragraphIndex;
        };
        Paragraph.prototype.getId = function () {
            return this._iD;
        };

        Paragraph.prototype.toJSON = function () {
            return "notImplement!!!!!!!!!!!!!!!!";
        };
        Paragraph.prototype.fromJSON = function (str) {
            var exception = "notImplement!!!!!!!!!!!!!!!!";
        };

        Object.defineProperty(Paragraph.prototype, "isEmphasized", {
            get: function () {
                return this._isEmphasized;
            },
            set: function (isem) {
                this._isEmphasized = isem;
                this.updateCacheHtml();
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Paragraph.prototype, "rawText", {
            set: function (raw) {
                this._rawText = raw;
                this.updateCacheHtml();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Paragraph.prototype, "nextParagraph", {
            get: function () {
                return this._nextParagraph;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Paragraph.prototype, "prevParagraph", {
            get: function () {
                return this._prevParagraph;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Paragraph.prototype, "isFinalParagraph", {
            //これが最終段落か否か
            get: function () {
                return this._nextParagraph == null;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Paragraph.prototype, "isFirstParagraph", {
            //これが最初の段落か否か
            get: function () {
                return this._prevParagraph == null;
            },
            enumerable: true,
            configurable: true
        });

        //HTML再生成
        Paragraph.prototype.updateCacheHtml = function () {
            var prefixes = [new TitlePrefix(), new DividerPrefix()];
            var tag;
            var rawStr = this._rawText;
            rawStr.replace(" ", "&ensp;"); //半角スペースは特殊文字として置き換える
            if (Utils.StringUtility.isEmpty(this._rawText)) {
                this._cacheHtml = "<br/>";
                return;
            }
            var isPrefixed = false;
            for (var i = 0; i < prefixes.length; i++) {
                if (prefixes[i].isPrefixOfMe(rawStr)) {
                    tag = $(prefixes[i].getFormattedHtml(rawStr));
                    isPrefixed = true;
                    break;
                }
            }
            if (!isPrefixed) {
                tag = $("<p/>");

                //エスケープ処理
                if (rawStr.charCodeAt(0) == 0x5c && rawStr.length > 1 && rawStr.charCodeAt(1) == 0x5c)
                    rawStr = "\\" + rawStr.substr(2, rawStr.length - 2); //\\の場合は\にする
                else if (rawStr.charCodeAt(0) == 0x5c && rawStr.charCodeAt(1) != 0x5c) {
                    rawStr = rawStr.substr(1, rawStr.length - 1);
                }

                tag.html(rawStr);
            }

            tag.addClass("p-" + this._paragraphIndex);
            if (this.isEmphasized)
                tag.addClass("em");
            this._cacheHtml = $("<div/>").append(tag).html();
        };

        //段落番号と最終段落番号の更新。常に整合性を保つ
        Paragraph.prototype.updateParagraphIndex = function () {
            if (this._prevParagraph != null) {
                this._paragraphIndex = this._prevParagraph._paragraphIndex + 1;
            } else {
                this._paragraphIndex = 0;
            }
            if (!this.isFinalParagraph)
                this._nextParagraph.updateParagraphIndex();
            else
                this._manager.lastParagraphIndex = this._paragraphIndex;
        };

        //指定した段落をこの段落の直後に挿入
        Paragraph.prototype.insertNext = function (next) {
            if (!this.isFinalParagraph) {
                var last = next.getLastParagraph();
                last._nextParagraph = this._nextParagraph;
                this._nextParagraph._prevParagraph = last;
            }
            next._prevParagraph = this;
            this._nextParagraph = next;
            next.updateParagraphIndex();
        };

        //指定した段落をこの段落の直前に挿入
        Paragraph.prototype.insertPrev = function (prev) {
            if (!this.isFirstParagraph) {
                prev._prevParagraph = this._prevParagraph;
                this._prevParagraph._nextParagraph = prev;
            }
            var last = prev.getLastParagraph();
            last._nextParagraph = this;
            this._prevParagraph = last;
            prev.updateParagraphIndex();
        };

        //指定したインデックスの段落を取得
        Paragraph.prototype.getParagraphByIndex = function (index) {
            if (!this.isFirstParagraph)
                return this._manager.headParagraph.getParagraphByIndex(index);
            var parag = this;
            for (var i = 0; i < index; i++) {
                parag = parag.nextParagraph;
            }
            return parag;
        };

        //この段落リストの末尾を取得
        Paragraph.prototype.getLastParagraph = function () {
            var parag = this;
            while (!parag.isFinalParagraph) {
                parag = parag._nextParagraph;
            }
            return parag;
        };

        //この段落リストの先頭を取得
        Paragraph.prototype.getFirstParagraph = function () {
            if (this.isFirstParagraph)
                return this;
            var parag = this;
            while (!parag.isFirstParagraph) {
                parag = parag._prevParagraph;
            }
            return parag;
        };

        //指定した番目までの段落のhtmlを結合して返す。
        Paragraph.prototype.getParagraphHtmls = function (count) {
            var cachedHtml = this._cacheHtml;
            var currentParagraph = this;

            for (var i = 0; i < count && !currentParagraph.isFinalParagraph; i++) {
                currentParagraph = currentParagraph.nextParagraph;
                cachedHtml += currentParagraph._cacheHtml;
            }
            return cachedHtml;
        };

        //生テキストを結合して返す。
        Paragraph.prototype.getParagraphRawTexts = function (count) {
            var cachedRawText = this.rawText;
            var currentParagraph = this;

            for (var i = 0; i < count && !currentParagraph.isFinalParagraph; i++) {
                currentParagraph = currentParagraph.nextParagraph;
                cachedRawText += "\n" + currentParagraph.rawText; //改行をはさんでおく
            }
            return cachedRawText;
        };

        //この段落を削除する
        Paragraph.prototype.removeThis = function () {
            if (this.isFinalParagraph) {
                this._prevParagraph._nextParagraph = null;
                return;
            }
            if (this.isFirstParagraph) {
                this._nextParagraph._prevParagraph = null;
                this.nextParagraph.updateParagraphIndex();
                return;
            } else {
                this.prevParagraph.insertNext(this.nextParagraph);
            }
        };

        //この段落の指定した位置で、この段落を二つの段落に分ける。分けた前半の段落を返す
        Paragraph.prototype.sepalateParagraph = function (pos) {
            var front = new Paragraph(this._manager, this._rawText.substr(0, pos));
            var back = new Paragraph(this._manager, this._rawText.substr(pos, this._rawText.length - pos));

            front._nextParagraph = back;
            back._prevParagraph = front;
            if (!this.isFinalParagraph) {
                back._nextParagraph = this._nextParagraph;
                this._nextParagraph._prevParagraph = back;
            }
            if (!this.isFirstParagraph) {
                this._prevParagraph.insertNext(front);
                return front;
            }
            front.updateParagraphIndex();
            return front;
        };

        Paragraph.prototype.toString = function () {
            return this.rawText;
        };
        return Paragraph;
    })();
    _NovelEditer.Paragraph = Paragraph;

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
    var PrefixBase = (function () {
        function PrefixBase() {
        }
        PrefixBase.prototype.isPrefixOfMe = function (str) {
            if (str.charCodeAt(0) == 0x5c)
                return false;
            if (Utils.StringUtility.startWith(str, this.getPrefixString()))
                return true;
            return false;
        };

        PrefixBase.prototype.getPrefixString = function () {
            return "Not Implemented!";
        };

        PrefixBase.prototype.getFormattedHtml = function (str) {
            var preLength = this.getPrefixString().length;
            return this.getFormattedHtmlImpl(str.substr(preLength, str.length - preLength));
        };

        PrefixBase.prototype.getFormattedHtmlImpl = function (str) {
            return "Not Implemented!";
        };
        return PrefixBase;
    })();

    var TitlePrefix = (function (_super) {
        __extends(TitlePrefix, _super);
        function TitlePrefix() {
            _super.apply(this, arguments);
        }
        TitlePrefix.prototype.getPrefixString = function () {
            return "#";
        };

        TitlePrefix.prototype.getFormattedHtmlImpl = function (str) {
            return "<h1>" + str + "</h1>";
        };
        return TitlePrefix;
    })(PrefixBase);

    var DividerPrefix = (function (_super) {
        __extends(DividerPrefix, _super);
        function DividerPrefix() {
            _super.apply(this, arguments);
        }
        DividerPrefix.prototype.getPrefixString = function () {
            return "-";
        };

        DividerPrefix.prototype.getFormattedHtmlImpl = function (str) {
            return "<hr/>";
        };
        return DividerPrefix;
    })(PrefixBase);

    //段落上でのカレット位置をあらわすクラス
    var CaretPosition = (function () {
        function CaretPosition(paragIndex, charIndex) {
            this.paragraphIndex = paragIndex;
            this.charIndex = charIndex;
        }
        return CaretPosition;
    })();
    _NovelEditer.CaretPosition = CaretPosition;

    //テキストの選択領域を表すクラス
    var TextRegion = (function () {
        function TextRegion(begin, end) {
            this.begin = begin;
            this.end = end;
        }
        TextRegion.fromCaretInfo = function (caret) {
            return new TextRegion(caret.begin, caret.end);
        };

        TextRegion.prototype.substr = function (text) {
            return text.substr(this.begin, this.end - this.begin);
        };

        TextRegion.prototype.isRegion = function () {
            return this.begin != this.end;
        };

        TextRegion.prototype.isFirst = function () {
            return !this.isRegion() && this.begin == 0;
        };

        TextRegion.prototype.toString = function () {
            return "[" + this.begin + "," + this.end + "]";
        };
        return TextRegion;
    })();
})(NovelEditer || (NovelEditer = {}));

var KeyCodes;
(function (KeyCodes) {
    (function (KeyCode) {
        KeyCode[KeyCode["Enter"] = 13] = "Enter";
        KeyCode[KeyCode["Home"] = 36] = "Home";
        KeyCode[KeyCode["PageUp"] = 33] = "PageUp";
        KeyCode[KeyCode["Delete"] = 46] = "Delete";
        KeyCode[KeyCode["End"] = 35] = "End";
        KeyCode[KeyCode["PageDown"] = 34] = "PageDown";
        KeyCode[KeyCode["ArrowLeft"] = 37] = "ArrowLeft";
        KeyCode[KeyCode["ArrowUp"] = 38] = "ArrowUp";
        KeyCode[KeyCode["ArrowRight"] = 39] = "ArrowRight";
        KeyCode[KeyCode["ArrowDown"] = 40] = "ArrowDown";
        KeyCode[KeyCode["BackSpace"] = 8] = "BackSpace";
    })(KeyCodes.KeyCode || (KeyCodes.KeyCode = {}));
    var KeyCode = KeyCodes.KeyCode;
})(KeyCodes || (KeyCodes = {}));

var Utils;
(function (Utils) {
    var StringUtility = (function () {
        function StringUtility() {
        }
        StringUtility.startWith = function (sourceStr, checkStr) {
            if (sourceStr.length < checkStr.length)
                return false;
            for (var i = 0; i < checkStr.length; i++) {
                if (checkStr.charCodeAt(i) != sourceStr.charCodeAt(i))
                    return false;
            }
            return true;
        };

        StringUtility.isEmpty = function (str) {
            return str.length == 0 || (str.charCodeAt(0) == 0x0a && str.length == 1);
        };
        return StringUtility;
    })();
    Utils.StringUtility = StringUtility;
})(Utils || (Utils = {}));
//# sourceMappingURL=novel-editor.js.map
