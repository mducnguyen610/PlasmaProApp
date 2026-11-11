package expo.modules.plasmausb

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException

// Cầu nối USB Host API của Android cho lớp thiết bị (DeviceTransport bản 'usb-android').
// Chỉ chuyển byte; định dạng khung nằm ở src/lib/device/protocol.config.ts.
class PlasmaUsbModule : Module() {
  private var port: Cp210xPort? = null
  private var portDeviceId: Int? = null
  private var reader: Thread? = null
  @Volatile private var reading = false
  private var detachReceiver: BroadcastReceiver? = null

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context lost")

  private val usb: UsbManager
    get() = context.getSystemService(Context.USB_SERVICE) as UsbManager

  override fun definition() = ModuleDefinition {
    Name("PlasmaUsb")
    Events("onData", "onDetached", "onError")

    OnCreate {
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, intent: Intent) {
          val dev = deviceFrom(intent) ?: return
          if (dev.deviceId == portDeviceId) closePort()
          sendEvent("onDetached", mapOf("deviceId" to dev.deviceId))
        }
      }
      register(receiver, IntentFilter(UsbManager.ACTION_USB_DEVICE_DETACHED))
      detachReceiver = receiver
    }

    OnDestroy {
      closePort()
      detachReceiver?.let { runCatching { context.unregisterReceiver(it) } }
      detachReceiver = null
    }

    AsyncFunction("listDevices") {
      usb.deviceList.values.map {
        mapOf(
          "deviceId" to it.deviceId,
          "vendorId" to it.vendorId,
          "productId" to it.productId,
          "name" to (it.productName ?: it.deviceName),
          "hasPermission" to usb.hasPermission(it)
        )
      }
    }

    AsyncFunction("requestPermission") { deviceId: Int, promise: Promise ->
      val dev = find(deviceId) ?: return@AsyncFunction promise.resolve(false)
      if (usb.hasPermission(dev)) return@AsyncFunction promise.resolve(true)
      val action = "${context.packageName}.USB_PERMISSION"
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, intent: Intent) {
          runCatching { context.unregisterReceiver(this) }
          promise.resolve(intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false))
        }
      }
      register(receiver, IntentFilter(action))
      // Android 12 trở lên đòi khai báo tính khả biến; hệ thống cần thêm extra vào intent nên dùng MUTABLE,
      // và intent phải chỉ đích rõ (setPackage) theo yêu cầu của Android 14.
      val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
      val intent = Intent(action).setPackage(context.packageName)
      usb.requestPermission(dev, PendingIntent.getBroadcast(context, 0, intent, flags))
    }

    AsyncFunction("open") { deviceId: Int, baudRate: Int, dataBits: Int, parity: String, stopBits: Int ->
      closePort()
      val dev = find(deviceId) ?: throw IOException("Thiết bị USB đã bị rút")
      if (dev.vendorId != Cp210xPort.VENDOR_ID) throw IOException("Chỉ hỗ trợ cầu CP210x (VID 0x10C4)")
      val p = Cp210xPort(usb, dev)
      p.open(baudRate, dataBits, parity, stopBits)
      port = p
      portDeviceId = deviceId
      startReader(p)
    }

    AsyncFunction("write") { data: ByteArray ->
      val p = port ?: throw IOException("Cổng chưa mở")
      p.write(data, WRITE_TIMEOUT_MS)
    }

    AsyncFunction("close") {
      closePort()
    }
  }

  private fun startReader(p: Cp210xPort) {
    reading = true
    reader = Thread {
      val buf = ByteArray(READ_BUFFER)
      while (reading) {
        val n = try {
          p.read(buf, READ_TIMEOUT_MS)
        } catch (e: Exception) {
          if (reading) sendEvent("onError", mapOf("message" to (e.message ?: "Lỗi đọc USB")))
          -1
        }
        if (n < 0) break
        if (n > 0) sendEvent("onData", mapOf("bytes" to buf.copyOf(n).map { it.toInt() and 0xff }))
      }
    }.apply {
      name = "PlasmaUsbReader"
      isDaemon = true
      start()
    }
  }

  @Synchronized
  private fun closePort() {
    reading = false
    reader?.let { runCatching { it.join(READ_TIMEOUT_MS.toLong() * 2) } }
    reader = null
    port?.close()
    port = null
    portDeviceId = null
  }

  private fun find(deviceId: Int): UsbDevice? = usb.deviceList.values.firstOrNull { it.deviceId == deviceId }

  private fun register(receiver: BroadcastReceiver, filter: IntentFilter) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      context.registerReceiver(receiver, filter)
    }
  }

  @Suppress("DEPRECATION")
  private fun deviceFrom(intent: Intent): UsbDevice? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
    } else {
      intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
    }

  companion object {
    private const val READ_BUFFER = 256
    private const val READ_TIMEOUT_MS = 200
    private const val WRITE_TIMEOUT_MS = 1000
  }
}
