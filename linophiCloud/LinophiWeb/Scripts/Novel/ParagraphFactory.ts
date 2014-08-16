module NovelEditer
{
    class ParagraphFactory
    {
        private _manager;
        constructor()
        {
            this._manager = new ParagraphManager();
        }
        createParagraph(json: string): Paragraph
        {
            var ret = new Paragraph(this._manager, "");
            ret.fromJSON(json);
            return ret;
        }
    }
}