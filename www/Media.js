/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */

/* global cordova */

var argscheck = require('cordova/argscheck');
var utils = require('cordova/utils');
var exec = require('cordova/exec');

var mediaObjects = {};

/**
 * This class provides access to the device media, interfaces to both sound and video
 *
 * @constructor
 * @param src                   The file name or url to play
 * @param successCallback       The callback to be called when the file is done playing or recording.
 *                                  successCallback()
 * @param errorCallback         The callback to be called if there is an error.
 *                                  errorCallback(int errorCode) - OPTIONAL
 * @param statusCallback        The callback to be called when media status has changed.
 *                                  statusCallback(int statusCode) - OPTIONAL
 */
var Media = function (src, successCallback, errorCallback, statusCallback) {
    argscheck.checkArgs('sFFF', 'Media', arguments);
    this.id = utils.createUUID();
    mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this._duration = -1;
    this._position = -1;
    exec(null, this.errorCallback, 'Media', 'create', [this.id, this.src]);
};

// Media messages
Media.MEDIA_STATE = 1;
Media.MEDIA_DURATION = 2;
Media.MEDIA_POSITION = 3;
Media.MEDIA_ERROR = 9;
Media.MEDIA_VOLUME_CHANGE = 10;

// Media states
Media.MEDIA_NONE = 0;
Media.MEDIA_STARTING = 1;
Media.MEDIA_RUNNING = 2;
Media.MEDIA_PAUSED = 3;
Media.MEDIA_STOPPED = 4;
Media.MEDIA_FINISHED = 6;
Media.MEDIA_MSG = ["None", "Starting", "Running", "Paused", "Stopped", "android-Loading", "Finished"];

// "static" function to return existing objs.
Media.get = function (id) {
    return mediaObjects[id];
};

/**
 * Start or resume playing audio file.
 */
Media.prototype.play = function (options) {
    exec(null, null, 'Media', 'startPlayingAudio', [this.id, this.src, options]);
};

/**
 * Stop playing audio file.
 */
Media.prototype.stop = function () {
    var me = this;
    exec(
        function () {
            me._position = 0;
        },
        this.errorCallback,
        'Media',
        'stopPlayingAudio',
        [this.id]
    );
};

/**
 * Seek or jump to a new time in the track..
 */
Media.prototype.seekTo = function (milliseconds) {
    var me = this;
    exec(
        function (p) {
            me._position = p;
        },
        this.errorCallback,
        'Media',
        'seekToAudio',
        [this.id, milliseconds]
    );
};

/**
 * Pause playing audio file.
 */
Media.prototype.pause = function () {
    exec(null, this.errorCallback, 'Media', 'pausePlayingAudio', [this.id]);
};

/**
 * Get duration of an audio file.
 * The duration is only set for audio that is playing, paused or stopped.
 *
 * @return      duration or -1 if not known.
 */
Media.prototype.getDuration = function () {
    return this._duration;
};

/**
 * Get position of audio.
 */
Media.prototype.getCurrentPosition = function (success, fail) {
    var me = this;
    exec(
        function (p) {
            me._position = p;
            success(p);
        },
        fail,
        'Media',
        'getCurrentPositionAudio',
        [this.id]
    );
};

/**
 * Start recording audio file.
 */
Media.prototype.startRecord = function () {
    exec(null, this.errorCallback, 'Media', 'startRecordingAudio', [this.id, this.src]);
};

/**
 * Stop recording audio file.
 */
Media.prototype.stopRecord = function () {
    exec(null, this.errorCallback, 'Media', 'stopRecordingAudio', [this.id]);
};

/**
 * Pause recording audio file.
 */
Media.prototype.pauseRecord = function () {
    exec(null, this.errorCallback, 'Media', 'pauseRecordingAudio', [this.id]);
};

/**
 * Resume recording audio file.
 */
Media.prototype.resumeRecord = function () {
    exec(null, this.errorCallback, 'Media', 'resumeRecordingAudio', [this.id]);
};

/**
 * Release the resources.
 */
Media.prototype.release = function () {
    var me = this;
    exec(
        function () {
            delete mediaObjects[me.id];
        },
        this.errorCallback,
        'Media',
        'release',
        [this.id]
    );
};

/**
 * Adjust the volume.
 */
Media.prototype.setVolume = function (volume) {
    exec(null, null, 'Media', 'setVolume', [this.id, volume]);
};

/**
 * Adjust the playback rate.
 */
Media.prototype.setRate = function (rate) {
    if (cordova.platformId === 'ios') {
        exec(null, null, 'Media', 'setRate', [this.id, rate]);
    } else {
        console.warn('media.setRate method is currently not supported for', cordova.platformId, 'platform.');
    }
};

/**
 * Get amplitude of audio.
 */
Media.prototype.getCurrentAmplitude = function (success, fail) {
    exec(
        function (p) {
            success(p);
        },
        fail,
        'Media',
        'getCurrentAmplitudeAudio',
        [this.id]
    );
};

/**
 * Set a callback to be triggered on volume change events.
 * @param {Function} callback Function that will be called with the new volume value when volume changes.
 */
Media.prototype.onVolumeChange = function (callback) {
    if (typeof callback !== 'function') {
        console.error('onVolumeChange requires a valid function as callback');
        return;
    }
    this.volumeChangeCallback = callback;
    console.log('Volume change callback registered for media ' + this.id);
    
    // Devolver un objeto que permite eliminar el listener
    var self = this;
    return {
        remove: function() {
            self.volumeChangeCallback = null;
        }
    };
};

/**
 * Get the current volume (only valid after a volume change event).
 * @return {Number} Current volume between 0.0 and 1.0, or -1 if unknown.
 */
Media.prototype.getVolume = function () {
    return typeof this._volume !== 'undefined' ? this._volume : -1;
};

/**
 * Audio has status update.
 * PRIVATE
 *
 * @param id            The media object id (string)
 * @param msgType       The 'type' of update this is
 * @param value         Use of value is determined by the msgType
 */
Media.onStatus = function (id, msgType, value) {
    var media = mediaObjects[id];

    if (media) {
        switch (msgType) {
        case Media.MEDIA_STATE:
            if (media.statusCallback) {
                media.statusCallback(value);
            }
            if (value === Media.MEDIA_STOPPED) {
                if (media.successCallback) {
                    media.successCallback();
                }
            }
            break;
        case Media.MEDIA_DURATION:
            media._duration = value;
            break;
        case Media.MEDIA_ERROR:
            if (media.errorCallback) {
                media.errorCallback(value);
            }
            break;
        case Media.MEDIA_POSITION:
            media._position = Number(value);
            break;
        case Media.MEDIA_VOLUME_CHANGE:
            console.log('Received volume change event: ' + value + ' for media id: ' + id);
            
            // Actualizar propiedad del objeto media
            media._volume = Number(value);
            
            // Método 1: Disparar evento DOM - disponible para todos los listeners
            try {
                var volumeChangeEvent = new CustomEvent('mediavolume', { 
                    bubbles: true,
                    cancelable: false,
                    detail: { 
                        id: id, 
                        volume: Number(value) 
                    } 
                });
                document.dispatchEvent(volumeChangeEvent);
                console.log('Dispatched mediavolume event to document');
                
                // También emitir en window para asegurar compatibilidad
                window.dispatchEvent(volumeChangeEvent);
            } catch (e) {
                console.error('Error dispatching volumechange event: ' + e.message);
            }
            
            // Método 2: Llamar al callback de estado del objeto media específico
            if (media.statusCallback) {
                var volumeInfo = { 
                    type: 'volumechange', 
                    volume: Number(value),
                    mediaId: id
                };
                media.statusCallback(volumeInfo);
                console.log('Called statusCallback with volume info');
            }
            
            // Método 3: Disparar evento en el objeto media (específico para este objeto)
            if (typeof media.volumeChangeCallback === 'function') {
                media.volumeChangeCallback(Number(value));
                console.log('Called volumeChangeCallback');
            }
            break;
        default:
            if (console.error) {
                console.error('Unhandled Media.onStatus :: ' + msgType);
            }
            break;
        }
    } else if (console.error) {
        console.error('Received Media.onStatus callback for unknown media :: ' + id);
    }
};

Media.stopAll = function(id) {
    exec(null, null, "Media", "stopAll", [id]);
};

module.exports = Media;

function onMessageFromNative (msg) {
    if (msg.action === 'status') {
        Media.onStatus(msg.status.id, msg.status.msgType, msg.status.value);
    } else {
        throw new Error('Unknown media action' + msg.action);
    }
}

if (cordova.platformId === 'android' || cordova.platformId === 'amazon-fireos' || cordova.platformId === 'windowsphone') {
    var channel = require('cordova/channel');

    channel.createSticky('onMediaPluginReady');
    channel.waitForInitialization('onMediaPluginReady');

    channel.onCordovaReady.subscribe(function () {
        exec(onMessageFromNative, undefined, 'Media', 'messageChannel', []);
        channel.initializationComplete('onMediaPluginReady');
    });
}
