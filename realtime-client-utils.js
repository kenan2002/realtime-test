/**
 * Copyright 2013 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 "use strict";

/**
 * @fileoverview Common utility functionality for Google Drive Realtime API,
 * including authorization and file loading. This functionality should serve
 * mostly as a well-documented example, though is usable in its own right.
 */


/**
 * @namespace Realtime client utilities namespace.
 */
var rtclient = rtclient || {};

/**
 * MIME type for newly created Realtime files.
 * @const
 */
rtclient.REALTIME_MIMETYPE = 'application/vnd.google-apps.drive-sdk';

rtclient.DEFAULT_USER_ID = 'kenan2002';


/**
 * Parses the hash parameters to this page and returns them as an object.
 * @function
 */
rtclient.getParams = function() {
  var params = {};
  var hashFragment = window.location.hash;
  if (hashFragment) {
    // split up the query string and store in an object
    var paramStrs = hashFragment.slice(1).split("&");
    for (var i = 0; i < paramStrs.length; i++) {
      var paramStr = paramStrs[i].split("=");
      params[paramStr[0]] = unescape(paramStr[1]);
    }
  }
  console.log(params);
  return params;
};


/**
 * Instance of the query parameters.
 */
rtclient.params = rtclient.getParams();


/**
 * Fetches an option from options or a default value, logging an error if
 * neither is available.
 * @param options {Object} containing options.
 * @param key {string} option key.
 * @param defaultValue {Object} default option value (optional).
 */
rtclient.getOption = function(options, key, defaultValue) {
  var value = options[key] == undefined ? defaultValue : options[key];
  if (value == undefined) {
    console.error(key + ' should be present in the options.');
  }
  console.log(value);
  return value;
}

/**
 * Creates a new Realtime file.
 * @param title {string} title of the newly created file.
 * @param mimeType {string} the MIME type of the new file.
 * @param callback {Function} the callback to call after creation.
 */
rtclient.createRealtimeFile = function(title, mimeType, callback) {
  var file = {
    title: title,
    mimeType: mimeType,
    id: 'Playground/0'
  };
  callback(file);
}


/**
 * Parses the state parameter passed from the Drive user interface after Open
 * With operations.
 * @param stateParam {Object} the state query parameter as an object or null if
 *     parsing failed.
 */
rtclient.parseState = function(stateParam) {
  try {
    var stateObj = JSON.parse(stateParam);
    return stateObj;
  } catch(e) {
    return null;
  }
}


/**
 * Handles authorizing, parsing query parameters, loading and creating Realtime
 * documents.
 * @constructor
 * @param options {Object} options for loader. Four keys are required as mandatory, these are:
 *
 *    1. "clientId", the Client ID from the console
 *    2. "initializeModel", the callback to call when the model is first created.
 *    3. "onFileLoaded", the callback to call when the file is loaded.
 *
 * and one key is optional:
 *
 *    1. "defaultTitle", the title of newly created Realtime files.
 */
rtclient.RealtimeLoader = function(options) {
  // Initialize configuration variables.
  this.onFileLoaded = rtclient.getOption(options, 'onFileLoaded');
  this.newFileMimeType = rtclient.getOption(options, 'newFileMimeType', rtclient.REALTIME_MIMETYPE);
  this.initializeModel = rtclient.getOption(options, 'initializeModel');
  this.registerTypes = rtclient.getOption(options, 'registerTypes', function(){});
  this.afterAuth = rtclient.getOption(options, 'afterAuth', function(){})
  this.autoCreate = rtclient.getOption(options, 'autoCreate', false); // This tells us if need to we automatically create a file after auth.
  this.defaultTitle = rtclient.getOption(options, 'defaultTitle', 'New Realtime File');
}


/**
 * Redirects the browser back to the current page with an appropriate file ID.
 * @param fileIds {Array.} the IDs of the files to open.
 * @param userId {string} the ID of the user.
 */
rtclient.RealtimeLoader.prototype.redirectTo = function(fileIds, userId) {
  var params = [];
  if (fileIds) {
    params.push('fileIds=' + fileIds.join(','));
  }
  if (userId) {
    params.push('userId=' + userId);
  }

  // Naive URL construction.
  var newUrl = params.length == 0 ? './' : ('./#' + params.join('&'));
  // Using HTML URL re-write if available.
  if (window.history && window.history.replaceState) {
    window.history.replaceState("Google Drive Realtime API Playground", "Google Drive Realtime API Playground", newUrl);
  } else {
    window.location.href = newUrl;
  }
  // We are still here that means the page didn't reload.
  rtclient.params = rtclient.getParams();
  for (var index in fileIds) {
    window.store.load(fileIds[index], this.onFileLoaded, this.initializeModel, this.handleErrors);
  }
}


/**
 * Starts the loader by authorizing.
 */
rtclient.RealtimeLoader.prototype.start = function() {
  // Bind to local context to make them suitable for callbacks.
  var hostname = 'channel.youryour.org';
  var port = 80;
  var url = location.protocol + '//' + hostname + ':' + port + '/channel';
  window.store = new realtime.store.StoreImpl(url, null);
  if (this.registerTypes) {
    this.registerTypes();
  }
  if (this.afterAuth) {
    this.afterAuth();
  }
  this.load();
}


/**
 * Handles errors thrown by the Realtime API.
 */
rtclient.RealtimeLoader.prototype.handleErrors = function(e) {
  console.error(e);
};


/**
 * Loads or creates a Realtime file depending on the fileId and state query
 * parameters.
 */
rtclient.RealtimeLoader.prototype.load = function() {
  var fileIds = rtclient.params['fileIds'];
  if (fileIds) {
    fileIds = fileIds.split(',');
  }
  var userId = rtclient.DEFAULT_USER_ID;
  var state = rtclient.params['state'];

  // We have file IDs in the query parameters, so we will use them to load a file.
  if (fileIds) {
    for (var index in fileIds) {
      window.store.load(fileIds[index], this.onFileLoaded, this.initializeModel, this.handleErrors);
    }
    return;
  }

  // We have a state parameter being redirected from the Drive UI. We will parse
  // it and redirect to the fileId contained.
  else if (state) {
    var stateObj = rtclient.parseState(state);
    // If opening a file from Drive.
    if (stateObj.action == "open") {
      fileIds = stateObj.ids;
      userId = stateObj.userId;
      this.redirectTo(fileIds, userId);
      return;
    }
  }

  if (this.autoCreate) {
    this.createNewFileAndRedirect();
  }
}


/**
 * Creates a new file and redirects to the URL to load it.
 */
rtclient.RealtimeLoader.prototype.createNewFileAndRedirect = function() {
  // No fileId or state have been passed. We create a new Realtime file and
  // redirect to it.
  var _this = this;
  rtclient.createRealtimeFile(this.defaultTitle, this.newFileMimeType, function(file) {
    if (file.id) {
      _this.redirectTo([file.id], rtclient.DEFAULT_USER_ID);
    }
    // File failed to be created, log why and do not attempt to redirect.
    else {
      console.error('Error creating file.');
      console.error(file);
    }
  });
}
