class NovelViewer
{
    private _finalLoadedParagraph: IParagraph;

    constructor()
    {
        
    }
}

class ParagraphFetcher
{
    getParagraph(from: number, to: number):IParagraph
    {
        return null;
    }
}

class DummyParagraphFetcher extends ParagraphFetcher
{
    getParagraph(from: number, to: number): IParagraph
    {
        
    }
}
