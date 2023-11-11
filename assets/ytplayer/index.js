/*! yt-player. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
var EventEmitter = function () {
  this.events = {};
};
(EventEmitter.prototype.on = function (t, e) {
  "object" != typeof this.events[t] && (this.events[t] = []),
    this.events[t].push(e);
}),
  (EventEmitter.prototype.removeListener = function (t, e) {
    var a;
    "object" == typeof this.events[t] &&
      (a = indexOf(this.events[t], e)) > -1 &&
      this.events[t].splice(a, 1);
  }),
  (EventEmitter.prototype.emit = function (t) {
    var e,
      a,
      i,
      s = [].slice.call(arguments, 1);
    if ("object" == typeof this.events[t])
      for (i = (a = this.events[t].slice()).length, e = 0; e < i; e++)
        a[e].apply(this, s);
  }),
  (EventEmitter.prototype.once = function (t, e) {
    this.on(t, function a() {
      this.removeListener(t, a), e.apply(this, arguments);
    });
  });
var loadScript = function (t, e, a) {
    return new Promise((i, s) => {
      var r = document.createElement("script");
      for (var [o, n] of ((r.async = !0), (r.src = t), Object.entries(e || {})))
        r.setAttribute(o, n);
      (r.onload = () => {
        (r.onerror = r.onload = null), i(r);
      }),
        (r.onerror = () => {
          (r.onerror = r.onload = null), s(new Error("Failed to load " + t));
        }),
        (
          a ||
          document.head ||
          document.getElementsByTagName("head")[0]
        ).appendChild(r);
    });
  },
  YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api",
  YOUTUBE_STATES = {
    "-1": "unstarted",
    0: "ended",
    1: "playing",
    2: "paused",
    3: "buffering",
    5: "cued",
  },
  YOUTUBE_ERROR = {
    INVALID_PARAM: 2,
    HTML5_ERROR: 5,
    NOT_FOUND: 100,
    UNPLAYABLE_1: 101,
    UNPLAYABLE_2: 150,
  },
  loadIframeAPICallbacks = [];
YouTubePlayer = class extends EventEmitter {
  constructor(t, e) {
    super();
    var a = "string" == typeof t ? document.querySelector(t) : t;
    a.id
      ? (this._id = a.id)
      : (this._id = a.id =
          "ytplayer-" + Math.random().toString(16).slice(2, 8)),
      (this._opts = Object.assign(
        {
          width: 640,
          height: 360,
          autoplay: !1,
          captions: void 0,
          controls: !0,
          keyboard: !0,
          fullscreen: !0,
          annotations: !0,
          modestBranding: !1,
          related: !0,
          timeupdateFrequency: 1e3,
          playsInline: !0,
          start: 0,
        },
        e
      )),
      (this.videoId = null),
      (this.destroyed = !1),
      (this._api = null),
      (this._autoplay = !1),
      (this._player = null),
      (this._ready = !1),
      (this._queue = []),
      (this._interval = null),
      (this._startInterval = this._startInterval.bind(this)),
      (this._stopInterval = this._stopInterval.bind(this)),
      this.on("playing", this._startInterval),
      this.on("unstarted", this._stopInterval),
      this.on("ended", this._stopInterval),
      this.on("paused", this._stopInterval),
      this.on("buffering", this._stopInterval),
      this._loadIframeAPI((t, e) => {
        if (t)
          return this._destroy(new Error("YouTube Iframe API failed to load"));
        (this._api = e),
          this.videoId && this.load(this.videoId, this._autoplay, this._start);
      });
  }
  load(t, e = !1, a = 0) {
    this.destroyed ||
      ((this.videoId = t),
      (this._autoplay = e),
      (this._start = a),
      this._api &&
        (this._player
          ? this._ready &&
            (e
              ? this._player.loadVideoById(t, a)
              : this._player.cueVideoById(t, a))
          : this._createPlayer(t)));
  }
  play() {
    this._ready ? this._player.playVideo() : this._queueCommand("play");
  }
  pause() {
    this._ready ? this._player.pauseVideo() : this._queueCommand("pause");
  }
  stop() {
    this._ready ? this._player.stopVideo() : this._queueCommand("stop");
  }
  seek(t) {
    this._ready ? this._player.seekTo(t, !0) : this._queueCommand("seek", t);
  }
  setVolume(t) {
    this._ready
      ? this._player.setVolume(t)
      : this._queueCommand("setVolume", t);
  }
  loadPlaylist() {
    this._ready
      ? this._player.loadPlaylist(this.videoId)
      : this._queueCommand("loadPlaylist", this.videoId);
  }
  setLoop(t) {
    this._ready ? this._player.setLoop(t) : this._queueCommand("setLoop", t);
  }
  getVolume() {
    return (this._ready && this._player.getVolume()) || 0;
  }
  mute() {
    this._ready ? this._player.mute() : this._queueCommand("mute");
  }
  unMute() {
    this._ready ? this._player.unMute() : this._queueCommand("unMute");
  }
  isMuted() {
    return (this._ready && this._player.isMuted()) || !1;
  }
  setSize(t, e) {
    this._ready
      ? this._player.setSize(t, e)
      : this._queueCommand("setSize", t, e);
  }
  setPlaybackRate(t) {
    this._ready
      ? this._player.setPlaybackRate(t)
      : this._queueCommand("setPlaybackRate", t);
  }
  setPlaybackQuality(t) {
    this._ready
      ? this._player.setPlaybackQuality(t)
      : this._queueCommand("setPlaybackQuality", t);
  }
  getPlaybackRate() {
    return (this._ready && this._player.getPlaybackRate()) || 1;
  }
  getAvailablePlaybackRates() {
    return (this._ready && this._player.getAvailablePlaybackRates()) || [1];
  }
  getDuration() {
    return (this._ready && this._player.getDuration()) || 0;
  }
  getProgress() {
    return (this._ready && this._player.getVideoLoadedFraction()) || 0;
  }
  getState() {
    return (
      (this._ready && YOUTUBE_STATES[this._player.getPlayerState()]) ||
      "unstarted"
    );
  }
  getCurrentTime() {
    return (this._ready && this._player.getCurrentTime()) || 0;
  }
  destroy() {
    this._destroy();
  }
  _destroy(t) {
    this.destroyed ||
      ((this.destroyed = !0),
      this._player &&
        (this._player.stopVideo && this._player.stopVideo(),
        this._player.destroy()),
      (this.videoId = null),
      (this._id = null),
      (this._opts = null),
      (this._api = null),
      (this._player = null),
      (this._ready = !1),
      (this._queue = null),
      this._stopInterval(),
      this.removeListener("playing", this._startInterval),
      this.removeListener("paused", this._stopInterval),
      this.removeListener("buffering", this._stopInterval),
      this.removeListener("unstarted", this._stopInterval),
      this.removeListener("ended", this._stopInterval),
      t && this.emit("error", t));
  }
  _queueCommand(t, ...e) {
    this.destroyed || this._queue.push([t, e]);
  }
  _flushQueue() {
    for (; this._queue.length; ) {
      var t = this._queue.shift();
      this[t[0]].apply(this, t[1]);
    }
  }
  _loadIframeAPI(t) {
    if (window.YT && "function" == typeof window.YT.Player)
      return t(null, window.YT);
    loadIframeAPICallbacks.push(t),
      Array.from(document.getElementsByTagName("script")).some(
        (t) => t.src === YOUTUBE_IFRAME_API_SRC
      ) ||
        loadScript(YOUTUBE_IFRAME_API_SRC).catch((t) => {
          for (; loadIframeAPICallbacks.length; ) {
            loadIframeAPICallbacks.shift()(t);
          }
        });
    var e = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      for ("function" == typeof e && e(); loadIframeAPICallbacks.length; ) {
        loadIframeAPICallbacks.shift()(null, window.YT);
      }
    };
  }
  _createPlayer(t) {
    if (!this.destroyed) {
      var e = this._opts;
      this._player = new this._api.Player(this._id, {
        width: e.width,
        height: e.height,
        videoId: t,
        host: e.host,
        playerVars: {
          autoplay: e.autoplay ? 1 : 0,
          hl: null != e.captions && !1 !== e.captions ? e.captions : void 0,
          cc_lang_pref:
            null != e.captions && !1 !== e.captions ? e.captions : void 0,
          controls: e.controls ? 2 : 0,
          enablejsapi: 1,
          allowfullscreen: !0,
          iv_load_policy: e.annotations ? 1 : 3,
          modestbranding: e.modestBranding ? 1 : 0,
          origin: "*",
          rel: e.related ? 1 : 0,
          mode: "transparent",
          showinfo: 0,
          html5: 1,
          version: 3,
          playerapiid: "iframe_YTP_1624972482514",
        },
        events: {
          onReady: () => this._onReady(t),
          onStateChange: (t) => this._onStateChange(t),
          onPlaybackQualityChange: (t) => this._onPlaybackQualityChange(t),
          onPlaybackRateChange: (t) => this._onPlaybackRateChange(t),
          onError: (t) => this._onError(t),
        },
      });
    }
  }
  _onReady(t) {
    this.destroyed ||
      ((this._ready = !0),
      this.load(this.videoId, this._autoplay, this._start),
      this._flushQueue());
  }
  _onStateChange(t) {
    if (!this.destroyed) {
      var e = YOUTUBE_STATES[t.data];
      if (!e) throw new Error("Unrecognized state change: " + t);
      ["paused", "buffering", "ended"].includes(e) && this._onTimeupdate(),
        this.emit(e),
        ["unstarted", "playing", "cued"].includes(e) && this._onTimeupdate();
    }
  }
  _onPlaybackQualityChange(t) {
    this.destroyed || this.emit("playbackQualityChange", t.data);
  }
  _onPlaybackRateChange(t) {
    this.destroyed || this.emit("playbackRateChange", t.data);
  }
  _onError(t) {
    if (!this.destroyed) {
      var e = t.data;
      if (e !== YOUTUBE_ERROR.HTML5_ERROR)
        return e === YOUTUBE_ERROR.UNPLAYABLE_1 ||
          e === YOUTUBE_ERROR.UNPLAYABLE_2 ||
          e === YOUTUBE_ERROR.NOT_FOUND ||
          e === YOUTUBE_ERROR.INVALID_PARAM
          ? this.emit("unplayable", this.videoId)
          : void this._destroy(
              new Error("YouTube Player Error. Unknown error code: " + e)
            );
    }
  }
  _onTimeupdate() {
    this.emit("timeupdate", this.getCurrentTime());
  }
  _startInterval() {
    this._interval = setInterval(
      () => this._onTimeupdate(),
      this._opts.timeupdateFrequency
    );
  }
  _stopInterval() {
    clearInterval(this._interval), (this._interval = null);
  }
};
