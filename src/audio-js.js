/*
 * audioJS
 * author: Evandro Leopoldino Gonçalves <evandrolgoncalves@gmail.com>
 * https://github.com/evandrolg
 * modified: bitplus (https://github.com/bitplus)
 * License: MIT
 */
(function (window) {
    'use strict';

    var ajax = function (params) {
        var httpRequest = new XMLHttpRequest();

        httpRequest.addEventListener('load', function () {
            params.success(httpRequest.response);
        }, false);

        try {
            httpRequest.open('GET', params.file, true);
            httpRequest.responseType = 'arraybuffer';
            httpRequest.send();
        } catch (e) {
            window.console.log(e);
        }
    };

    var getArrayBuffer = function (params) {
        var fileReader = new FileReader();

        //end of converting to array buffer
        fileReader.onloadend = function () {
            params.success(fileReader.result);
        }

        try {
            //convert byte to array buffer
            fileReader.readAsArrayBuffer(params.file);
        } catch (e) {
            window.console.log(e);
        }
    };

    var CallbackManager = function () {
        return {
            register: function (obj) {
                this.callback = obj.callback;
                this.context = obj.context;
            },

            execute: function () {
                if (this.callback) {
                    this.callback.call(this.context);
                }
            }
        };
    };

    var AudioJS = function (params) {
        if (!params) {
            throw 'You need to pass a value as parameter!';
        }

        this._cachedVariabes(params);
        this._load();
    };

    AudioJS.prototype = {
        _validateFormat: function () {
            var regex = /\.(mp3|opus|ogg|wav|m4a|weba)$/;
            var isValid = regex.test(this.file) || (this.file instanceof Blob);

            if (!isValid) {
                throw 'The format of the audio file is invalid!';
            }
        },

        _createInstance: function () {
            var AudioContext = window.AudioContext || window.webkitAudioContext || null;
            var hasSupport = AudioContext;

            if (!hasSupport) {
                throw 'Your browser does not support API AudioContext!';
            }
            
            if (AudioJS.prototype._audioContext === undefined||!AudioJS.prototype._audioContext) {
              AudioJS.prototype._audioContext = new AudioContext;
            }

            this.audioContext = AudioJS.prototype._audioContext;
        },

        _cachedVariabes: function (params) {
            this._createInstance();

            var isString = typeof params === 'string';

            if (isString) {
                this.file = params;
            } else {
                this.file = params.file;
                this.autoPlay = params.autoPlay;
                this.loop = params.loop || false;
                this.volume = params.volume || 1;
                this.isBlob = params.file instanceof Blob;

                this.gainNode = this.audioContext.createGain();
                this.gainNode.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.015);
                this.gainNode.connect(this.audioContext.destination);
            }

            this._validateFormat();



            this.callbackManager = new CallbackManager();
        },

        _load: function () {
            var that = this;
            var func = this.isBlob ? getArrayBuffer : ajax;

            func({
                file: this.file,
                success: function (response) {
                    that._decodeAudioData.call(that, response);
                    //Registry.musicLoaded = true;
                    //updateLoader();
                }
            });
        },

        _decodeAudioData: function (response) {
            var that = this;
            var audioContext = this.audioContext;

            audioContext.decodeAudioData(response,
                function (buffer) {
                    that.source = audioContext.createBufferSource();
                    that.source.buffer = buffer;
                    //that.source.connect(audioContext.destination);
                    that.source.connect(that.gainNode);
                    that.source.loop = that.loop;
                    that.buffer = buffer;

                    if (that.autoPlay || that.shouldPlay) {
                        that.callbackManager.register({
                            callback: that._play,
                            context: that
                        });

                        that.callbackManager.execute();
                    }
                },

                function () {
                    throw 'Decoding the audio buffer failed!';
                }
            );
        },

        _play: function () {
            this.source.addEventListener('ended', function () {
                //console.log('source ended 1');
                //callback(source);
            }, false);
            this.source.start(0);
            this.isStarted = true;
        },

        play: function () {
            this.callbackManager.register({
                callback: this._play,
                context: this
            });

            // if we want to play the sound again after stop //
            if (this.buffer && this.shouldPlay) {
                this.source = this.audioContext.createBufferSource();
                this.source.buffer = this.buffer;
                //this.source.connect(this.audioContext.destination);
                //this.source.gain.value = this.volume;
                this.source.connect(this.gainNode);
                this.source.loop = this.loop;
                this.source.addEventListener('ended', function () {
                    //console.log('source ended 2');
                    //callback(source);
                }, false);
                this.source.start(0);
                this.isStarted = true;
            }

            this.shouldPlay = true;
        },

        stop: function () {
            if (this.isStarted) {
                this.source.stop(0);
                this.isStarted = false;
            }
        }
    };

    window.audioJS = function (params) {
        return new AudioJS(params);
    };
}(this));
