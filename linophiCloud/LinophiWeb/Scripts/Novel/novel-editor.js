var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var editorInstance;
$(function () {
    editorInstance = new NovelEditer.NovelEditer($(".edit-context"), $(".preview-body"));
    editorInstance.createEmpty();
    editorInstance.updateToshow();
});

var NovelEditer;
(function (_NovelEditer) {
    var NovelEditer = (function () {
        function NovelEditer(editorTarget, previewTarget) {
            var _this = this;
            this._editorTarget = editorTarget;
            this._previewTarget = previewTarget;
            this._editorTarget.keypress(function (event) {
                return _this.inputCommited(event);
            });
            this._editorTarget.keyup(function (event) {
                return _this.saveInput(event);
            });

            //マウスによってキャレットが移動した際は位置を保存しておく
            this._editorTarget.mousedown(function () {
                return _this.mouseHandler();
            });
            this._editorTarget.mouseup(function () {
                return _this.mouseHandler();
            });
            this._editorTarget.bind('paste', function () {
                return _this.pasteCommited();
            });
            this._editorTarget.bind('input propertychange', function () {
                return _this.textChanged();
            });

            //this._editorTarget.mousemove(() => this.recordLastCaret());
            this._lastCaret = new TextRegion(0, 0);
            this._lastText = this._editorTarget.val();
        }
        //最後のキャレットの位置を保存する
        NovelEditer.prototype.recordLastCaret = function () {
            this._lastCaret = TextRegion.fromCaretInfo(this._editorTarget.caret());
            this._lastText = this._editorTarget.val();
            console.warn("lastCaret updated:" + this._lastCaret.toString());
        };

        //現在のパラグラフを次に移動する
        NovelEditer.prototype.moveNext = function () {
            this.currentParagraphChanged(this._currentParagraph.nextParagraph);
        };

        NovelEditer.prototype.movePrev = function () {
            this.currentParagraphChanged(this._currentParagraph.prevParagraph);
        };

        //何らかの入力がなされた場合
        NovelEditer.prototype.inputCommited = function (event) {
            this.recordLastCaret();
            this._lastText = this._editorTarget.val();
        };

        //ここがキモなんだよねえ
        NovelEditer.prototype.saveInput = function (event) {
            var caret = TextRegion.fromCaretInfo(this._editorTarget.caret());
            if (!caret.isRegion() && !this._lastCaret.isRegion()) {
                if (event.keyCode == 13 /* Enter */ && this._editorTarget.val().charCodeAt(caret.begin - 1) == 0x0a) {
                    if (caret.begin - 1 >= 0) {
                        this._currentParagraph.setParagraphText(this._editorTarget.val(), caret.begin - 1);
                    }
                    this._currentParagraph.insertNext(new Paragraph(this));
                    this.moveNext();
                } else if (_.include(NovelEditer._shiftCaretKeys, event.keyCode)) {
                    var lfc = this.countLf(this._lastText.substr(0, caret.begin));
                    this.currentParagraphChanged(this._pageFirstParagraph.getParagraph(lfc));
                    this.updateToshow();
                } else if (event.keyCode == 8 /* BackSpace */ && caret.begin != 0) {
                    var c = this.countLf(this._lastTextOnKeyDown.substr(caret.begin, this._lastCaret.begin - caret.begin));
                    if (c != 0) {
                        console.warn("deleted range" + caret.begin + "," + this._lastCaret.begin + "lfc:" + c);
                        var pCache = this._currentParagraph;
                        this.currentParagraphChanged(this._currentParagraph.getParagraph(-c));
                        pCache.removeRange(-c + 1);
                    }
                } else if (event.keyCode == 46 /* Delete */) {
                    var delCount = this._lastTextOnKeyDown.length - this._editorTarget.val().length;
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
        };

        NovelEditer.prototype.createEmpty = function () {
            this._currentParagraph = new Paragraph(this);
            this._pageFirstParagraph = this._currentParagraph;
            this._currentParagraph.isEmphasized = true;
        };

        NovelEditer.prototype.updateToshow = function () {
            this._previewTarget.html(this._pageFirstParagraph.getParagraphHtmls(20));
        };

        //変更された場合true、同じならfalse
        NovelEditer.prototype.currentParagraphChanged = function (currentParagraph) {
            if (this._currentParagraph == currentParagraph)
                return false;
            this._currentParagraph.isEmphasized = false;
            this._currentParagraph = currentParagraph;
            this._currentParagraph.isEmphasized = true;
            console.info("currentParagraph:" + currentParagraph.rawText);
            return true;
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
            this.recordLastCaret();
            this.updateFocusLine();
            var region = TextRegion.fromCaretInfo(this._editorTarget.caret());
            if (!region.isRegion()) {
                var lfc = this.countLf(this._lastText.substr(0, region.begin));
                this.currentParagraphChanged(this._pageFirstParagraph.getParagraph(lfc));
                this.updateToshow();
            }
        };

        NovelEditer.prototype.pasteCommited = function () {
            this._isPasted = true;
            this._lastTextOnPaste = this._editorTarget.val();
            this._caretOnPaste = TextRegion.fromCaretInfo(this._editorTarget.caret());
        };

        NovelEditer.prototype.textChanged = function () {
            if (this._isPasted) {
                this._isPasted = false;
                var diffLength = this._editorTarget.val().length - this._lastTextOnPaste.length;
                var difftext = this._editorTarget.val().substr(this._caretOnPaste.begin, diffLength);
                this._currentParagraph.setParagraphText(this._editorTarget.val(), this._caretOnPaste.begin);
                this.currentParagraphChanged(this._currentParagraph.insertTextToAfter(difftext));
            }
        };
        NovelEditer._endOfLineChar = ["\n"];
        NovelEditer._shiftCaretKeys = [39 /* ArrowRight */, 37 /* ArrowLeft */, 40 /* ArrowDown */, 38 /* ArrowUp */];
        return NovelEditer;
    })();
    _NovelEditer.NovelEditer = NovelEditer;

    var Page = (function () {
        function Page() {
        }
        return Page;
    })();
    _NovelEditer.Page = Page;

    //段落クラス
    var Paragraph = (function () {
        function Paragraph(editer) {
            this._isEmphasized = false;
            this.paragraphIndex = 0;
            this._calculatedWidth = 0;
            this._editer = editer;
            this.rawText = "";
            this.updateCacheHtml();
        }
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
        Paragraph.createInstance = function (editer, rawText) {
            var instance = new Paragraph(editer);
            instance.rawText = rawText;
            return instance;
        };

        Object.defineProperty(Paragraph.prototype, "ParagraphIndex", {
            get: function () {
                return this.paragraphIndex;
            },
            enumerable: true,
            configurable: true
        });

        Paragraph.prototype.updateParagraphIndex = function () {
            if (this.prevParagraph != null) {
                this.paragraphIndex = this.prevParagraph.paragraphIndex + 1;
            } else {
                this.paragraphIndex = 0;
            }
            this.updateCacheHtml();
            if (!this.isFinalParagraph)
                this.nextParagraph.updateParagraphIndex();
        };

        Object.defineProperty(Paragraph.prototype, "nextParagraph", {
            get: function () {
                return this._nextParagraph;
            },
            set: function (next) {
                if (next == null && !this.isFinalParagraph)
                    this.nextParagraph._prevParagraph = null; //次を消した場合は次のノードであったものから前のノードを消す
                this._nextParagraph = next;
                if (next != null && next.prevParagraph != this)
                    next.prevParagraph = this; //次のパラグラフの前のパラグラフが自分自身でないなら付け替える。
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Paragraph.prototype, "prevParagraph", {
            get: function () {
                return this._prevParagraph;
            },
            set: function (prev) {
                if (prev == null && !this.isFirstParagraph)
                    this.prevParagraph._nextParagraph = null;
                this._prevParagraph = prev;
                if (prev != null && prev.nextParagraph != this)
                    prev.nextParagraph = this; //前のパラグラフの次のパラグラフが自分自身でないなら付け替える。
                this.updateParagraphIndex();
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

        Object.defineProperty(Paragraph.prototype, "rawText", {
            get: function () {
                return this.paragraphIndex + this._rawText;
            },
            set: function (raw) {
                this._rawText = raw;
                this.updateCacheHtml();
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Paragraph.prototype, "html", {
            get: function () {
                return this._cacheHtml;
            },
            enumerable: true,
            configurable: true
        });

        //この段落を削除する
        Paragraph.prototype.removeThis = function () {
            if (this.isFinalParagraph || this.isFirstParagraph) {
                if (this.isFinalParagraph) {
                    this.prevParagraph.nextParagraph = null;
                }
                return;
            } else {
                this.prevParagraph.nextParagraph = this.nextParagraph;
            }
        };

        //自分を含めて指定したインデックス番目まで削除します。
        Paragraph.prototype.removeRange = function (index) {
            var cp = this;
            var cp2;
            if (index < 0) {
                index--; //自分自身の削除を入れるため
                while (index != 0 && !cp.isFirstParagraph) {
                    cp2 = cp.prevParagraph;
                    cp.removeThis();
                    cp = cp2;
                    index++;
                }
            } else if (index > 0) {
                index++;
                while (index != 0 && !cp.isFinalParagraph) {
                    cp2 = cp.nextParagraph;
                    cp.removeThis();
                    cp = cp2;
                    index--;
                }
            } else {
                this.removeThis();
            }
        };

        //このパラグラフに挿入されたテキスト(改行を含む)を改行で分割してパラグラフに分ける。最終パラグラフを返す
        Paragraph.prototype.insertTextToAfter = function (str) {
            var num = str.indexOf("\n");
            var subStr = str.substr(num + 1, str.length - num - 1);
            if (subStr.length == 0 || num == -1)
                return this;
            var paragpraph = new Paragraph(this._editer);
            var newParagraph;
            this.insertNext(paragpraph);
            while (true) {
                paragpraph.setParagraphText(subStr, 0);
                num = subStr.indexOf("\n");
                if (num == -1) {
                    break;
                }
                subStr = subStr.substr(num + 1, subStr.length - num - 1);
                if (subStr.length == 0)
                    break;
                newParagraph = new Paragraph(this._editer);
                paragpraph.insertNext(newParagraph);
                paragpraph = newParagraph;
            }
            return paragpraph;
        };

        Paragraph.prototype.insertNext = function (next) {
            var p = this.nextParagraph;
            this.nextParagraph = next;
            next.nextParagraph = p;
        };

        //このパラグラフから指定番目を取得する
        Paragraph.prototype.getParagraph = function (dist) {
            var currentParagraph = this;
            while (dist != 0) {
                if (dist < 0) {
                    if (currentParagraph.prevParagraph == null)
                        currentParagraph.prevParagraph = new Paragraph(this._editer); //存在しない場合は付け加える
                    currentParagraph = currentParagraph.prevParagraph;
                } else {
                    if (currentParagraph.nextParagraph == null)
                        currentParagraph.nextParagraph = new Paragraph(this._editer);
                    currentParagraph = currentParagraph.nextParagraph;
                }
                dist += dist < 0 ? 1 : -1;
            }
            return currentParagraph;
        };

        //指定した番目までの段落のhtmlを結合して返す。
        Paragraph.prototype.getParagraphHtmls = function (count) {
            var cachedHtml = this.html;
            var currentParagraph = this;

            for (var i = 0; i < count && !currentParagraph.isFinalParagraph; i++) {
                currentParagraph = currentParagraph.nextParagraph;
                cachedHtml += currentParagraph.html;
            }
            return cachedHtml;
        };

        Paragraph.prototype.getParagraphRawTexts = function (count) {
            var cachedRawText = this.rawText;
            var currentParagraph = this;

            for (var i = 0; i < count && !currentParagraph.isFinalParagraph; i++) {
                currentParagraph = currentParagraph.nextParagraph;
                cachedRawText += currentParagraph.rawText;
            }
            return cachedRawText;
        };

        Paragraph.prototype.countParagraph = function (max) {
            var cacheParagraph = this;
            var count = 0;
            for (var i = 0; i < max; i++) {
                if (cacheParagraph.isFinalParagraph)
                    break;
                count++;
                cacheParagraph = cacheParagraph.nextParagraph;
            }
            return count;
        };

        //指定した文字列のcharIndex番目がこのパラグラフ内に存在するとしてこのパラグラフを構成します。
        Paragraph.prototype.setParagraphText = function (str, charIndex) {
            var begin = charIndex;
            var end = charIndex;
            for (var i = charIndex; i <= str.length; i++) {
                end = i;
                if (str.charCodeAt(i) == 0x0a)
                    break;
            }
            for (var j = charIndex; j >= 0; j--) {
                begin = j;
                if (j == 0 || str.charCodeAt(j - 1) == 0x0a)
                    break;
            }
            this.rawText = str.substr(begin, end - begin);
        };

        Paragraph.prototype.toString = function () {
            return this.rawText;
        };

        Paragraph.prototype.updateCalculatedWidth = function () {
            this._calculatedWidth = $(this._cacheHtml).width();
        };

        Paragraph.prototype.updateCacheHtml = function () {
            var prefixes = [new TitlePrefix(), new DividerPrefix()];
            var tag;
            var rawStr = this.rawText;
            rawStr.replace(" ", "&ensp;"); //半角スペースは特殊文字として置き換える
            if (Utils.StringUtility.isEmpty(this.rawText)) {
                this._cacheHtml = "<br/>";
                this.updateCalculatedWidth();
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
            if (this.isEmphasized)
                tag.addClass("em");
            this._cacheHtml = $("<div/>").append(tag).html();
            this.updateParagraphIndex();
        };
        return Paragraph;
    })();
    _NovelEditer.Paragraph = Paragraph;

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
