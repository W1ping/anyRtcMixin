// anyRtc mixin
// 文档 https://docs.anyrtc.io/cn/Video/api-ref/rtc_web/overview
import ArRTC from 'ar-rtc-sdk'
export default {
  data() {
    return {
      rtcClient: null, // rtc客户端实例
      audioTrack: null,
      videoTrack: null,
      videoDevices: [], // 可用的摄像头设备
      audioDevices: [], // 可用的麦克风
      playbackDevices: [], // 可用的扬声器
      isJoin: false, // 本地是否加入频道
      isRemotePublish: false, // 远端是否创建视频音频
      isLocalTrackCreated: false // 本地音频视频轨道是否建立
    }
  },
  methods: {
    async init() {
      // 只输出错误日志信息
      ArRTC.setLogLevel(3)
      // 创建 client 实例 
      this.rtcClient = ArRTC.createClient({ mode: "live", codec: "h264" })
      // 创建本地音频视频轨道
      await this.creatAllTrack()
      // 开启监听
      this.creatAllOn()
      console.log('<---初始化完成--->')
    },
    // 加入某个频道
    join(params) {
      const { appid, channel, token, uid } = params
      this.rtcClient.join(appid, channel, token, uid)
        .then(_ => {
          // 加入频道成功
          this.isJoin = true
          // 发布本地频道到房间里
          setTimeout(() => {
            this.publish()
          })
        })
        .catch(err => {
        // 加入频道失败
          console.error('加入频道失败===>', err)
          this.isJoin = false
        })
    },
    // 创建本地音频和视频轨道
    creatAllTrack() {
      // 初始化配置
      const audioConfig = {
        AEC: true,
        AGC: true,
        ANC: true
      }
      const videoConfig = {
        facingMode: 'user'
      }
      ArRTC.createMicrophoneAndCameraTracks(audioConfig, videoConfig).then(([audioTrack, videoTrack]) => {
        console.log('成功创建本地音频和视频轨道')
        this.audioTrack = audioTrack
        this.videoTrack = videoTrack
        this.isLocalTrackCreated = true
      })
    },
    // 播放视频音频 传入要播放的元素id 不需要 '#'
    async play(elementId) {
      !this.videoTrack && await this.creatAllTrack()
      !this.videoTrack.isPlaying && this.videoTrack.play(elementId, { fit: 'contain' })
      !this.audioTrack.isPlaying && this.audioTrack.play()
    },
    // 创建各类监听事件
    creatAllOn() {
      // 服务器 与 SDK 连接情况
      this.rtcClient.on('connection-state-change', (curState, revState, reason) => {
        if (curState === 'DISCONNECTED') {
          console.error(reason)
        }
      })
      // 监听是否有人加入
      this.rtcClient.on('user-joined', _ => {
        console.log('对方加入了视频通话频道')
      })
      // 监听是否有人离开
      this.rtcClient.on('user-left', _ => {
        console.log('对方离开了视频通话')
      })
      // 通知远端用户发布了新的音频轨道或者视频轨道
      this.rtcClient.on('user-published', async(user, mediaType) => {
        console.log('对方发布了视频语音通话频道')
        // 订阅远端用户的音视频轨道
        await this.rtcClient.subscribe(user, mediaType)
        if (mediaType === 'video') {
          // 在页面上播放媒体轨道。
          this.isRemotePublish = true
          // 在这里填入播放远端视频音频流数据 的 标签的id
          user.videoTrack.play('xxx')
        }
        if (mediaType === 'audio') {
          user.audioTrack.play()
        }
      })
    },
    // 发布本地音频和视频轨道
    publish() {
      this.rtcClient.publish([this.videoTrack, this.audioTrack])
        .then(_ => {
          // 发布成功
          console.log('频道发布成功')
        })
        .catch(err => {
          // 发布失败
          console.log('发布失败', err)
        })
    },
    // 离开频道
    leave() {
      this.isJoin = false
      this.isRemotePublish = false
      this.closeAllTrack()
      this.rtcClient.leave()
    },
    // 释放本地创建的轨道
    closeAllTrack() {
      this.audioTrack && this.audioTrack.close() // 释放音频设备
      this.videoTrack && this.videoTrack.close() // 释放视频设备
      this.audioTrack = this.videoTrack = null
    },
    // 枚举可用的输入输出设备，可用于日志的输出
    async getDevices() {
      ArRTC.getDevices()
        .then(devices => {
          // 音频输入设备
          this.audioDevices = devices.filter(function(device) {
            return device.kind === 'audioinput'
          })
          // 视频输入设备
          this.videoDevices = devices.filter(function(device) {
            return device.kind === 'videoinput'
          })
          // 音频输出设备
          this.playbackDevices = devices.filter(function(device) {
            return device.kind === 'audiooutput'
          })
        })
    }
  },
  beforeDestroy() {
    this.leave()
  }
}
