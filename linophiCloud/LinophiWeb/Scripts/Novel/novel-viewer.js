var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var NovelViewer = (function () {
    function NovelViewer() {
    }
    return NovelViewer;
})();

var ParagraphFetcher = (function () {
    function ParagraphFetcher() {
    }
    ParagraphFetcher.prototype.getParagraph = function (from, to) {
        return null;
    };
    return ParagraphFetcher;
})();

var DummyParagraphFetcher = (function (_super) {
    __extends(DummyParagraphFetcher, _super);
    function DummyParagraphFetcher() {
        _super.apply(this, arguments);
    }
    DummyParagraphFetcher.prototype.getParagraph = function (from, to) {
    };
    return DummyParagraphFetcher;
})(ParagraphFetcher);
//# sourceMappingURL=novel-viewer.js.map
