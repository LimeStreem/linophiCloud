/// <reference path="../typings/jquery/jquery.d.ts" />
var editPage;
$(function () {
    editPage = new EditPage();
});

function selectEditBody() {
    editPage.CurrentPage = 0 /* EditBody */;
}

function selectConfigure() {
    editPage.CurrentPage = 1 /* Configure */;
}

function selectEditBelt() {
    editPage.CurrentPage = 2 /* EditBelt */;
}

var EditPage = (function () {
    function EditPage() {
        this.asp = new AspectRatioStrecher(1.44969, $(".preview-container"), false);
        this.CurrentPage = 0 /* EditBody */;
        var st = new HeightStretcher($(".editor-content-bg"), $(".editor-bg-overlay"));
        st.addSubElement($("header"));
        st.addSubElement($(".editor-footer"));
        st.updateTargetProperty();
        var st2 = new HeightStretcher($(".novel-editor-container-inner"), $(".novel-editor-container-outer"));
        st2.addSubElement($(".body-editor-header .half-divider"));
        st2.updateTargetProperty();
    }
    Object.defineProperty(EditPage.prototype, "CurrentPage", {
        get: function () {
            return this.currentPage;
        },
        set: function (val) {
            this.currentPage = val;
            this.OnCurrentPageChanged();
        },
        enumerable: true,
        configurable: true
    });


    EditPage.prototype.OnCurrentPageChanged = function () {
        switch (this.CurrentPage) {
            case 0 /* EditBody */:
                $(".editor-tab-container ul li").removeClass("selected");
                $(".tab-item-editbody").addClass("selected");
                break;
            case 1 /* Configure */:
                $(".editor-tab-container ul li").removeClass("selected");
                $(".tab-item-configure").addClass("selected");
                break;
            case 2 /* EditBelt */:
                $(".editor-tab-container ul li").removeClass("selected");
                $(".tab-item-editbelt").addClass("selected");
                break;
            default:
        }
    };
    return EditPage;
})();

var EditPageContents;
(function (EditPageContents) {
    EditPageContents[EditPageContents["EditBody"] = 0] = "EditBody";
    EditPageContents[EditPageContents["Configure"] = 1] = "Configure";
    EditPageContents[EditPageContents["EditBelt"] = 2] = "EditBelt";
})(EditPageContents || (EditPageContents = {}));
//# sourceMappingURL=EditPage.js.map
