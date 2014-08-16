class NovelViewer
{
    private _finalLoadedParagraph: IParagraph;

    private _paragraphFactory: NovelEditer.ParagraphFactory;

    private _paragraphFetcher:ParagraphFetcher=new DummyParagraphFetcher(this._paragraphFactory);

    constructor()
    {
        
    }
}

class ParagraphFetcher
{
    _paragraphFactory:NovelEditer.ParagraphFactory;

    constructor(factory:NovelEditer.ParagraphFactory)
    {
        this._paragraphFactory = factory;
    }
    getParagraph(from: number, to: number):IParagraph
    {
        return null;
    }
}

class DummyParagraphFetcher extends ParagraphFetcher
{
    
}
