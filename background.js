'use strict';

chrome.browserAction.onClicked.addListener(() => chrome.tabs.create({
  url: 'data/viewer/index.html'
}));
