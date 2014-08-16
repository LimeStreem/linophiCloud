var NovelEditer;
(function (NovelEditer) {
    var ParagraphFactory = (function () {
        function ParagraphFactory() {
            this._manager = new NovelEditer.ParagraphManager();
        }
        ParagraphFactory.prototype.createParagraph = function (json) {
            var ret = new NovelEditer.Paragraph(this._manager, "");
            ret.fromJSON(json);
            return ret;
        };
        return ParagraphFactory;
    })();
    NovelEditer.ParagraphFactory = ParagraphFactory;
})(NovelEditer || (NovelEditer = {}));
//# sourceMappingURL=ParagraphFactory.js.map
