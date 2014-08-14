/// <reference path="../collections.ts" />
var HeightStretcher = (function () {
    function HeightStretcher(target, fillOwner) {
        var _this = this;
        $(window).resize(function () {
            _this.updateTargetProperty();
        });
        this.targetElement = target;
        this.fillOwner = fillOwner;
        this.subElements = new collections.LinkedList();
        this.updateTargetProperty();
    }
    Object.defineProperty(HeightStretcher.prototype, "TargetElement", {
        get: function () {
            return this.targetElement;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(HeightStretcher.prototype, "FillOwner", {
        get: function () {
            return this.fillOwner;
        },
        enumerable: true,
        configurable: true
    });

    HeightStretcher.prototype.addSubElement = function (elem) {
        var _this = this;
        elem.resize(function () {
            _this.updateTargetProperty();
        });
        this.subElements.add(elem);
    };

    HeightStretcher.prototype.updateTargetProperty = function () {
        var sumLength = 0;
        for (var i = 0; i < this.subElements.size(); i++) {
            sumLength += this.subElements.elementAtIndex(i).height();
        }
        this.targetElement.height(this.fillOwner.height() - sumLength);
        console.warn(sumLength);
    };
    return HeightStretcher;
})();
//# sourceMappingURL=HeightStretcher.js.map
