﻿var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var NovelEditer;
(function (_NovelEditer) {
    var NovelEditer = (function () {
        function NovelEditer(editorTarget, previewTarget, previewBounds) {
            var _this = this;
            //直前のカレット位置
            this._lastCaret = new TextRegion(0, 0);
            //直前の編集文字列
            this._lastText = "";
            //改行コードの位置を示す。
            //テキスト末尾も含む
            this._paragraphList = new collections.LinkedList();
            this._previewBounds = previewBounds;
            this._editorTarget = editorTarget;
            this._previewTarget = previewTarget;
            this._editorTarget.keyup(function (event) {
                return _this.saveInput(event);
            });

            //            マウスによってキャレットが移動した際は位置を保存しておく
            this._editorTarget.mousedown(function () {
                return _this.mouseHandler();
            });
            this._editorTarget.mouseup(function () {
                return _this.mouseHandler();
            });
            this._editorTarget.bind('input propertychange', function () {
                return _this.textChanged();
            });
            $(".next-page").click(function () {
                _this.gonextPage();
            });
            $(".prev-page").click(function () {
                _this.goprevPage();
            });
            this._paragraphManager = new ParagraphManager();
            this._paragraphList.add(0);
        }
        NovelEditer.prototype.textChanged = function () {
            //console.info("textChanged is Called...!:\t"+this._editorTarget.val());
        };

        //キー入力による編集文字列変化の反映処理
        NovelEditer.prototype.saveInput = function (event) {
            console.info("saveInput is Called...!");

            var currentText = this._editorTarget.val();
            if (currentText != this._lastText) {
                var changeInfo = this.checkChangeText(currentText);

                //変化してる最初のパラグラフの頭のインデックス
                var changeStartIndexOfText;
                if (changeInfo.changeStartParagraphIndex == null)
                    changeStartIndexOfText = 0;
                else
                    changeStartIndexOfText = this.getParagraphStartIndex(changeInfo.changeStartParagraphIndex + 1);

                //変化の最後の次
                var changeEndIndexOfText;
                if (changeInfo.changeEndParagrapgIndex == null)
                    changeEndIndexOfText = currentText.length;
                else
                    changeEndIndexOfText = this.getParagraphStartIndex(changeInfo.changeEndParagrapgIndex);
                var changetext = currentText.substring(changeStartIndexOfText, changeEndIndexOfText);

                var parag = this._paragraphManager.createParagraphFromText(changetext);

                if (changeInfo.changeStartParagraphIndex == null) {
                    if (changeInfo.changeEndParagrapgIndex == null) {
                        this._paragraphManager.headParagraph = parag;
                        this._paragraphManager.changeCurrentParagraph(parag);
                        parag.updateParagraphIndex();
                    } else {
                        this._paragraphManager.getParagraphByIndex(changeInfo.changeEndParagrapgIndex).insertPrev(parag);
                    }
                } else {
                    this._paragraphManager.removeParagraphRange(changeInfo.changeStartParagraphIndex, changeInfo.changeEndParagrapgIndex);
                    this._paragraphManager.getParagraphByIndex(changeInfo.changeStartParagraphIndex).insertNext(parag);
                }
            }

            var caret = TextRegion.fromCaretInfo(this._editorTarget.caret());

            for (var j = 0; j < this._paragraphList.size(); j++) {
                var num = this._paragraphList.elementAtIndex(j);
                if (caret.begin <= num) {
                    this._paragraphManager.changeCurrentParagraphByIndex(j);
                    break;
                }
            }

            //if (_.include(NovelEditer._shiftCaretKeys, event.keyCode))
            //{//矢印キーによる移動
            //    console.info("catch [Arrow]");
            //    var subStr: string;
            //    if (this._lastCaret.begin < caret.begin)
            //    {
            //        subStr = this._lastText.substring(this._lastCaret.begin, caret.begin);
            //        var clf: number = this.countLf(subStr);
            //        for (var i = 0; i < clf; i++)
            //        {
            //            this._paragraphManager.moveNext();
            //        }
            //    }
            //    else if (this._lastCaret.begin > caret.begin)
            //    {
            //        subStr = this._lastText.substring(caret.begin, this._lastCaret.begin);
            //        var clf: number = this.countLf(subStr);
            //        for (var i = 0; i < clf; i++)
            //        {
            //            this._paragraphManager.movePrev();
            //        }
            //    }
            //    /*直前と現在の
            //     * カレット位置の間に挟まれる文字列を取得し、その中に現れる改行コード分だけ
            //     * currentをずらす
            //     */
            //}
            this._lastCaret = caret;
            this.updateToshow();

            console.info("\tcurrent       =\t" + this._paragraphManager.currentParagraph.getParagraphIndex() + ":" + this._paragraphManager.currentParagraph.rawText);

            //console.info("\tlastCurret:   =\t" + this._lastCaret.begin);
            var str = "";
            for (var i = 0; i < this._paragraphList.size(); i++) {
                str += ", " + this._paragraphList.elementAtIndex(i);
            }
            console.info("endParag:       \t" + str);
            console.info("\tparagraphCount=\t" + this._paragraphManager.paragraphCount + "\n");
        };

        //テキストの変更箇所を探して、更新します
        NovelEditer.prototype.checkChangeText = function (currentText) {
            if (this._lastText == "") {
                this._lastText = currentText;
                this._paragraphList.clear();
                for (var l = 0; l < currentText.length; l++) {
                    if (currentText.charCodeAt(l) == 0x0a) {
                        this._paragraphList.add(l);
                    }
                }
                this._paragraphList.add(currentText.length);
                return new TextChangeInfo(null, null);
            }
            if (currentText == "") {
                this._lastText = "";
                this._paragraphList.clear();
                this._paragraphList.add(0);
                return new TextChangeInfo(null, null);
            }

            //変更がない
            if (currentText == this._lastText)
                return new TextChangeInfo(0, 0);

            var parag = this._paragraphManager.headParagraph;
            var changeStart = 0;
            var str = currentText;
            while (true) {
                if (parag.isFinalParagraph) {
                    if (str != parag.rawText) {
                        if (changeStart == 0) {
                            changeStart = null;
                            break;
                        }
                        changeStart--;
                        break;
                    }
                    if (str.substr(0, parag.rawText.length + 1) == parag.rawText + "\n") {
                        changeStart = parag.getParagraphIndex();
                        break;
                    }
                }
                if (str.substr(0, parag.rawText.length + 1) == parag.rawText + "\n") {
                    str = str.substr(parag.rawText.length);
                    parag = parag.nextParagraph;
                    continue;
                }
                if (changeStart == 0) {
                    changeStart = null;
                    break;
                }
                changeStart--;
                break;
            }

            var changeEnd = this._paragraphManager.lastParagraphIndex;
            str = currentText; //コピー
            parag = this._paragraphManager.getParagraphByIndex(this._paragraphManager.lastParagraphIndex);
            while (true) {
                if (parag.isFirstParagraph) {
                    changeEnd = null;
                    break;
                }
                if (str.substr(str.length - parag.rawText.length - 1) == "\n" + parag.rawText) {
                    str = str.substr(0, str.length - parag.rawText.length);
                    parag = parag.prevParagraph;
                    continue;
                }
                if (changeEnd == this._paragraphManager.lastParagraphIndex) {
                    changeEnd = null;
                    break;
                }
                changeEnd++;
                break;
            }

            var ret = new TextChangeInfo(changeStart, changeEnd);

            //更新処理
            var num = ret.changeStartParagraphIndex;
            if (num == null)
                num = -1;
            num++;
            while (this._paragraphList.size() > num) {
                this._paragraphList.removeElementAtIndex(num);
            }
            for (var k = this.getParagraphStartIndex(num); k < currentText.length; k++) {
                if (currentText.charCodeAt(k) == 0x0a) {
                    this._paragraphList.add(k);
                }
            }
            this._paragraphList.add(currentText.length);
            this._lastText = currentText;
            return ret;
        };

        //指定段落の開始インデックスを取得
        NovelEditer.prototype.getParagraphStartIndex = function (paragraphIndex) {
            if (paragraphIndex == 0)
                return 0;
            return this._paragraphList.elementAtIndex(paragraphIndex - 1) + 1;
        };

        NovelEditer.prototype.updateToshow = function () {
            var i = 1;
            while (i <= this._paragraphManager.lastParagraphIndex + 1) {
                this._previewTarget.html(this._paragraphManager.headParagraph.getParagraphHtmls(i));
                if (this._previewTarget.width() > this._previewBounds.width()) {
                    this._previewTarget.html(this._paragraphManager.headParagraph.getParagraphHtmls(i - 1));
                    break;
                }
                i++;
            }
            this._nextPageFirstParagraph = this._paragraphManager.headParagraph.getParagraphFromthis(i);
            console.warn(this._nextPageFirstParagraph);
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

        NovelEditer.prototype.toJSON = function () {
            var innerJSON = "";
            var cacheParagraph = this._paragraphManager.headParagraph;
            while (true) {
                innerJSON += cacheParagraph.toJSON();
                if (!cacheParagraph.isFinalParagraph)
                    innerJSON += ",";
                if (cacheParagraph.isFinalParagraph)
                    break;
                cacheParagraph = cacheParagraph.nextParagraph;
            }
            return "[" + innerJSON + "]";
        };

        NovelEditer.prototype.mouseHandler = function () {
            //console.info("mouseHandler is Called...!");
            //var caret: TextRegion = TextRegion.fromCaretInfo(this._editorTarget.caret());
            //this._caret = caret;
            //this.updateFocusLine();
            //var region = TextRegion.fromCaretInfo(this._editorTarget.caret());
            //if (!region.isRegion())
            //{
            //    var lfc = this.countLf(this._lastText.substr(0, region.begin));
            //    this.currentParagraphChanged(this._pageFirstParagraph.getParagraph(lfc));
            //    this.updateToshow();
            //}
        };

        NovelEditer.prototype.gonextPage = function () {
            if (this._nextPageFirstParagraph != null) {
                this._paragraphManager.headParagraph = this._nextPageFirstParagraph;
                this.updateToshow();
            }
        };
        NovelEditer.prototype.goprevPage = function () {
            var i = 1;
            var cacheHead = this._paragraphManager.headParagraph;
            if (cacheHead.isFirstParagraph)
                return;
            while (true) {
                cacheHead = cacheHead.prevParagraph;
                while (i <= this._paragraphManager.lastParagraphIndex + 1) {
                    this._previewTarget.html(cacheHead.getParagraphHtmls(i));
                    if (this._previewTarget.width() > this._previewBounds.width()) {
                        this._previewTarget.html(cacheHead.getParagraphHtmls(i - 1));
                        break;
                    }
                    i++;
                }
                var next = cacheHead.getParagraphFromthis(i);
                if (next == this._paragraphManager.headParagraph)
                    break;
                if (cacheHead.isFinalParagraph)
                    break;
                cacheHead = cacheHead.prevParagraph;
            }
            this._paragraphManager.headParagraph = cacheHead;
        };
        NovelEditer._endOfLineChar = ["\n"];
        NovelEditer._shiftCaretKeys = [39 /* ArrowRight */, 37 /* ArrowLeft */, 40 /* ArrowDown */, 38 /* ArrowUp */];
        return NovelEditer;
    })();
    _NovelEditer.NovelEditer = NovelEditer;
    var TextChangeInfo = (function () {
        function TextChangeInfo(start, end) {
            this.changeStartParagraphIndex = start;
            this.changeEndParagrapgIndex = end;
        }
        return TextChangeInfo;
    })();
    _NovelEditer.TextChangeInfo = TextChangeInfo;
    var ParagraphManager = (function () {
        function ParagraphManager() {
            this._paragraphDictionary = new collections.Dictionary();
            //最終段落のインデックス
            this._lastParagraphIndex = 0;
            this._headParagraph = new Paragraph(this, "");
            this._lastParagraphIndex = 0;
            this._currentParagraph = this._headParagraph;
        }
        Object.defineProperty(ParagraphManager.prototype, "ParagraphDictionary", {
            get: function () {
                return this._paragraphDictionary;
            },
            enumerable: true,
            configurable: true
        });

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
            set: function (val) {
                this._headParagraph = val;
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

        //ディクショナリへの登録
        ParagraphManager.prototype.registParagraph = function (parag) {
            if (this._paragraphDictionary.containsKey(parag.getId()))
                return;
            this._paragraphDictionary.setValue(parag.getId(), parag);
        };

        //ディクショナリからの解除
        ParagraphManager.prototype.unregistParagraph = function (id) {
            this._paragraphDictionary.remove(id);
        };

        //現在の段落(とその強調表示)を変更する
        ParagraphManager.prototype.changeCurrentParagraph = function (currentParagraph) {
            this._currentParagraph.isEmphasized = false;
            this._currentParagraph = currentParagraph;
            this._currentParagraph.isEmphasized = true;
            console.info("currentParagraph:" + currentParagraph.rawText);
        };

        //startからendをつないで、その間を削除。end==nullで後ろ全部
        ParagraphManager.prototype.removeParagraphRange = function (start, end) {
            var startParag = this.getParagraphByIndex(start);
            var currentIndex = this._currentParagraph.getParagraphIndex();
            if (end == null) {
                if (start < currentIndex) {
                    this.changeCurrentParagraph(startParag);
                }
                startParag.nextParagraph = null;
                startParag.updateParagraphIndex();
                this.refreshRegist();
                return;
            }
            if (start < currentIndex && currentIndex < end)
                this.changeCurrentParagraph(startParag);
            var endParag = this.getParagraphByIndex(end);
            startParag.nextParagraph = endParag;
            endParag.prevParagraph = startParag;
            this.refreshRegist();
        };

        //toJson():string[]
        //{
        //    this.refreshRegist();
        //    var ret: string[] = new Array(this.lastParagraphIndex + 1);
        //    for (var i = 0; i < ; i++)
        //    {
        //    }
        //}
        //登録を再確認
        ParagraphManager.prototype.refreshRegist = function () {
            this._paragraphDictionary.clear();
            this._headParagraph.updateParagraphIndex();
        };

        //現在の段落(とその強調表示)をインデックス指定で変更する
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
            this.registParagraph(parag);
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
            var num = str.indexOf("\n");
            if (num == -1)
                return new Paragraph(this, str);

            var parag = new Paragraph(this, str.substr(0, num));
            if (num == str.length - 1) {
                parag.insertNext(new Paragraph(this, ""));
                return parag;
            }
            str = str.substr(num + 1, str.length - num - 1); //改行の後ろ

            while (true) {
                num = str.indexOf("\n"); //改行を探す
                if (num == -1) {
                    parag.insertNext(new Paragraph(this, str));
                    return parag.getFirstParagraph();
                }
                parag.insertNext(new Paragraph(this, str.substr(0, num)));
                parag = parag.nextParagraph;
                if (num == str.length - 1) {
                    parag.insertNext(new Paragraph(this, ""));
                    return parag.getFirstParagraph();
                }
                str = str.substr(num + 1, str.length - num - 1); //改行の後ろ
            }
        };

        //指定したカレット位置を段落上のカレット位置に変換する
        ParagraphManager.prototype.getCaretPositionAsParag = function (caretPos) {
            var parag = this._headParagraph;
            var paragPos = 0;
            while (parag.rawText.length < caretPos) {
                if (parag.isFinalParagraph) {
                    var ret = new CaretPosition(paragPos, 0);
                    ret.isParagraphLast = true;
                    ret.isTextLast = true;
                    return ret;
                }
                caretPos -= parag.rawText.length + 1;
                paragPos++;
                parag = parag.nextParagraph;
            }
            var pos = new CaretPosition(paragPos, caretPos);
            if (parag.rawText.length == caretPos) {
                pos.isParagraphLast = true;
                if (pos.paragraphIndex == this._lastParagraphIndex)
                    pos.isTextLast = true;
            }
            return pos;
        };

        //現在のカレットの編集文字列を再読み込み
        ParagraphManager.prototype.reLoadParagraph = function (text, caretPos) {
            this._currentParagraph.paragraphReload(text, caretPos);
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
            //ID
            this._iD = "Not Implemented!";
            this._manager = manager;
            this._rawText = rawText;
            this._iD = this.generateId();
            this.updateCacheHtml();
        }
        Paragraph.prototype.getPrevParagraph = function () {
            return this.prevParagraph;
        };

        Paragraph.prototype.getNextParagraph = function () {
            return this.nextParagraph;
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

        Paragraph.prototype.generateId = function () {
            var id = "";
            for (var i = 0; i < 10; i++) {
                id += Paragraph._IdString.substr(Math.floor(Math.random() * Paragraph._IdString.length), 1);
            }
            return id;
        };

        Paragraph.prototype.toJSON = function () {
            var jsonObj = {
                prevParagraph: this.isFirstParagraph ? null : this.prevParagraph.getId(),
                nextParagraph: this.isFinalParagraph ? null : this.nextParagraph.getId(),
                rawText: this.rawText,
                paragraphIndex: this._paragraphIndex,
                id: this._iD
            };
            return JSON.stringify(jsonObj);
        };
        Paragraph.prototype.fromJSON = function (jsonObj) {
            if (jsonObj.prevParagraph != null && this._manager.ParagraphDictionary.containsKey(jsonObj.prevParagraph)) {
                this.prevParagraph = this._manager.ParagraphDictionary.getValue(jsonObj.prevParagraph);
                this.prevParagraph.nextParagraph = this;
            }
            if (jsonObj.nextParagraph != null && this._manager.ParagraphDictionary.containsKey(jsonObj.nextParagraph)) {
                this.nextParagraph = this._manager.ParagraphDictionary.getValue(jsonObj.nextParagraph);
                this.nextParagraph.prevParagraph = this;
            }
            this.rawText = jsonObj.rawText;
            this.updateCacheHtml();
            this._paragraphIndex = jsonObj.paragraphIndex;
            this._iD = jsonObj.id;
            if (!this._manager.ParagraphDictionary.containsKey(this._iD)) {
                this._manager.ParagraphDictionary.setValue(this._iD, this);
            }
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
            get: function () {
                return this._rawText;
            },
            set: function (raw) {
                this._rawText = raw;
                this.updateCacheHtml();
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Paragraph.prototype, "isFinalParagraph", {
            //これが最終段落か否か
            get: function () {
                return this.nextParagraph == null;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(Paragraph.prototype, "isFirstParagraph", {
            //これが最初の段落か否か
            get: function () {
                return this.prevParagraph == null;
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
            var markups = [new BoldMarkup(), new RubyMarkupBase()];
            for (var j = 0; j < markups.length; j++) {
                rawStr = markups[j].getMarkupString(rawStr);
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
            this._manager.registParagraph(this);
            if (this.prevParagraph != null) {
                this._paragraphIndex = this.prevParagraph._paragraphIndex + 1;
            } else {
                this._paragraphIndex = 0;
                this._manager.headParagraph = this;
            }
            if (!this.isFinalParagraph)
                this.nextParagraph.updateParagraphIndex();
            else
                this._manager.lastParagraphIndex = this._paragraphIndex;
        };

        //指定した段落をこの段落の直後に挿入
        Paragraph.prototype.insertNext = function (next) {
            this._manager.registParagraph(next);
            if (!this.isFinalParagraph) {
                var last = next.getLastParagraph();
                last.nextParagraph = this.nextParagraph;
                this.nextParagraph.prevParagraph = last;
            }
            next.prevParagraph = this;
            this.nextParagraph = next;
            next.updateParagraphIndex();
        };

        //指定した段落をこの段落の直前に挿入
        Paragraph.prototype.insertPrev = function (prev) {
            this._manager.registParagraph(prev);
            if (!this.isFirstParagraph) {
                prev.prevParagraph = this.prevParagraph;
                this.prevParagraph.nextParagraph = prev;
            }
            var last = prev.getLastParagraph();
            last.nextParagraph = this;
            this.prevParagraph = last;
            prev.updateParagraphIndex();
        };

        //指定したインデックスの段落を取得
        Paragraph.prototype.getParagraphByIndex = function (index) {
            if (!this.isFirstParagraph)
                return this._manager.headParagraph.getParagraphByIndex(index);
            var parag = this;
            for (var i = 0; i < index; i++) {
                if (parag.nextParagraph == null)
                    return parag.nextParagraph;
                parag = parag.nextParagraph;
            }
            return parag;
        };

        Paragraph.prototype.getParagraphFromthis = function (dest) {
            var parag = this;
            for (var i = 0; i < dest; i++) {
                if (parag.nextParagraph == null)
                    return parag.nextParagraph;
                parag = parag.nextParagraph;
            }
            return parag;
        };

        //この段落リストの末尾を取得
        Paragraph.prototype.getLastParagraph = function () {
            var parag = this;
            while (!parag.isFinalParagraph) {
                parag = parag.nextParagraph;
            }
            return parag;
        };

        //この段落リストの先頭を取得
        Paragraph.prototype.getFirstParagraph = function () {
            if (this.isFirstParagraph)
                return this;
            var parag = this;
            while (!parag.isFirstParagraph) {
                parag = parag.prevParagraph;
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
            this._manager.unregistParagraph(this._iD);
            if (this.isFinalParagraph) {
                if (this.isFirstParagraph) {
                    this.rawText = "";
                    this.updateParagraphIndex();
                    return;
                }
                this.prevParagraph.nextParagraph = null;
                this._manager.lastParagraphIndex--;
                if (this._manager.currentParagraph == this)
                    this._manager.changeCurrentParagraph(this.prevParagraph);
                return;
            }
            if (this.isFirstParagraph) {
                this.nextParagraph.prevParagraph = null;
                this.nextParagraph.updateParagraphIndex();
                if (this._manager.currentParagraph == this)
                    this._manager.changeCurrentParagraph(this.nextParagraph);
                return;
            } else {
                this.prevParagraph.nextParagraph = this.nextParagraph;
                this.nextParagraph.prevParagraph = this.prevParagraph;
                this.nextParagraph.updateParagraphIndex();
                if (this._manager.currentParagraph == this)
                    this._manager.changeCurrentParagraph(this.prevParagraph);
            }
        };

        //この段落の指定した位置で、この段落を二つの段落に分ける。分けた前半の段落を返す
        Paragraph.prototype.sepalateParagraph = function (pos) {
            var front = new Paragraph(this._manager, this._rawText.substr(0, pos));
            var back = new Paragraph(this._manager, this._rawText.substr(pos, this._rawText.length - pos));

            if (this._manager.currentParagraph == this)
                this._manager.changeCurrentParagraph(back);

            front.nextParagraph = back;
            back.prevParagraph = front;

            this.removeThis();
            if (!this.isFinalParagraph) {
                back.nextParagraph = this.nextParagraph;
                this.nextParagraph.prevParagraph = back;
            }
            if (!this.isFirstParagraph) {
                front.prevParagraph = this.prevParagraph;
                this.prevParagraph.nextParagraph = front;
                //this.prevParagraph.insertNext(front);
                //return front;
            }
            front.updateParagraphIndex();
            this._manager.unregistParagraph(this._iD);
            this._manager.registParagraph(front);
            this._manager.registParagraph(front.nextParagraph);
            return front;
        };

        //文字列の指定したカレット位置を含むように段落文を再構成します
        Paragraph.prototype.paragraphReload = function (text, caretPos) {
            var begin = caretPos;
            var end = caretPos;
            for (var i = caretPos - 1; i >= 0; i--) {
                if (text.charCodeAt(i) == 0x0a)
                    break;
                begin = i;
            }
            for (var j = caretPos; j < text.length + 1; j++) {
                end = j;
                if (text.charCodeAt(j) == 0x0a)
                    break;
            }
            var subtext = text.substring(begin, end);
            this._rawText = subtext;
            this.updateCacheHtml();
        };

        Paragraph.prototype.toString = function () {
            return this.rawText;
        };
        Paragraph._IdString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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

    //段落上でのカレット位置をあらわすクラス
    var CaretPosition = (function () {
        function CaretPosition(paragIndex, charIndex) {
            this.isTextLast = false;
            this.isParagraphLast = false;
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
