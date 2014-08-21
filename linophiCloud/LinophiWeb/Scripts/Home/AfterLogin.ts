$(() => {
    $(".title-tooltiper").attr("title", '<div class="tip-container"><h1 class="tip-book-title">無職転生</h1><h2 class="tip-book-auther">理不尽な孫の手:著<h2><p></div>');
    $(".title-tooltiper").tooltipster({
        contentAsHTML:true,
        position:"bottom"
    });
});
