(function() {
    if (window.focusFlowInjected) return;
    window.focusFlowInjected = true;

    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        chrome.runtime.sendMessage({
            type: 'checkSite',
            url: window.location.href
        }).catch(() => {
        });
    }
})();