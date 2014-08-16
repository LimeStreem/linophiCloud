interface IParagraph extends IJSONable
{
    getPrevParagraph(): IParagraph;
    getNextParagraph():IParagraph;
    getCachedHtml(): string;
    getParagraphIndex(): number;
    getId():string;
}

interface IJSONable
{
    toJSON(): string;
    fromJSON(str:string):void;
}