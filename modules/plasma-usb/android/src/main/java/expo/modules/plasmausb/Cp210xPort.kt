package expo.modules.plasmausb

import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import java.io.IOException

// Trình điều khiển tối thiểu cho cầu USB-UART Silicon Labs CP210x (CP2102N trên mạch Plasma Pro, GA-2).
// Mã lệnh theo Silicon Labs AN571 "CP210x Virtual COM Port Interface": yêu cầu vendor gửi tới interface,
// IFC_ENABLE 0x00, SET_LINE_CTL 0x03, SET_MHS 0x07, SET_BAUDRATE 0x1E.
class Cp210xPort(private val manager: UsbManager, private val device: UsbDevice) {
  private var connection: UsbDeviceConnection? = null
  private var intf: UsbInterface? = null
  private var inEp: UsbEndpoint? = null
  private var outEp: UsbEndpoint? = null

  fun open(baudRate: Int, dataBits: Int, parity: String, stopBits: Int) {
    val conn = manager.openDevice(device) ?: throw IOException("Không mở được thiết bị USB (chưa có quyền?)")
    val iface = device.getInterface(0)
    if (!conn.claimInterface(iface, true)) {
      conn.close()
      throw IOException("Không chiếm được giao diện USB")
    }
    for (i in 0 until iface.endpointCount) {
      val ep = iface.getEndpoint(i)
      if (ep.type != UsbConstants.USB_ENDPOINT_XFER_BULK) continue
      if (ep.direction == UsbConstants.USB_DIR_IN) inEp = ep else outEp = ep
    }
    if (inEp == null || outEp == null) {
      conn.releaseInterface(iface)
      conn.close()
      throw IOException("Thiết bị USB không có cặp endpoint bulk")
    }
    connection = conn
    intf = iface
    control(IFC_ENABLE, UART_ENABLE, null)
    val baud = byteArrayOf(
      (baudRate and 0xff).toByte(),
      ((baudRate shr 8) and 0xff).toByte(),
      ((baudRate shr 16) and 0xff).toByte(),
      ((baudRate shr 24) and 0xff).toByte()
    )
    control(SET_BAUDRATE, 0, baud)
    control(SET_LINE_CTL, lineCtl(dataBits, parity, stopBits), null)
    control(SET_MHS, MCR_DTR or MCR_RTS or CONTROL_WRITE_DTR or CONTROL_WRITE_RTS, null)
  }

  /** Đọc tối đa buffer.size byte; trả số byte đọc được, 0 khi hết thời gian chờ, -1 khi lỗi. */
  fun read(buffer: ByteArray, timeoutMs: Int): Int {
    val conn = connection ?: return -1
    val n = conn.bulkTransfer(inEp, buffer, buffer.size, timeoutMs)
    return if (n < 0) 0 else n
  }

  fun write(data: ByteArray, timeoutMs: Int) {
    val conn = connection ?: throw IOException("Cổng chưa mở")
    val ep = outEp ?: throw IOException("Cổng chưa mở")
    var offset = 0
    while (offset < data.size) {
      val chunk = minOf(ep.maxPacketSize, data.size - offset)
      val n = conn.bulkTransfer(ep, data, offset, chunk, timeoutMs)
      if (n <= 0) throw IOException("Ghi USB thất bại")
      offset += n
    }
  }

  fun close() {
    val conn = connection ?: return
    try {
      control(IFC_ENABLE, UART_DISABLE, null)
    } catch (_: IOException) {
      // Máy có thể đã bị rút; vẫn giải phóng tài nguyên bên dưới.
    }
    intf?.let { conn.releaseInterface(it) }
    conn.close()
    connection = null
    intf = null
    inEp = null
    outEp = null
  }

  private fun control(request: Int, value: Int, data: ByteArray?) {
    val conn = connection ?: throw IOException("Cổng chưa mở")
    val index = intf?.id ?: 0
    val n = conn.controlTransfer(REQTYPE_HOST_TO_INTERFACE, request, value, index, data, data?.size ?: 0, CONTROL_TIMEOUT_MS)
    if (n < 0) throw IOException("Lệnh điều khiển CP210x 0x%02X thất bại".format(request))
  }

  companion object {
    const val VENDOR_ID = 0x10C4

    private const val REQTYPE_HOST_TO_INTERFACE = 0x41
    private const val IFC_ENABLE = 0x00
    private const val SET_LINE_CTL = 0x03
    private const val SET_MHS = 0x07
    private const val SET_BAUDRATE = 0x1E
    private const val UART_ENABLE = 0x0001
    private const val UART_DISABLE = 0x0000
    private const val MCR_DTR = 0x0001
    private const val MCR_RTS = 0x0002
    private const val CONTROL_WRITE_DTR = 0x0100
    private const val CONTROL_WRITE_RTS = 0x0200
    private const val CONTROL_TIMEOUT_MS = 1000

    /** SET_LINE_CTL: bit 0..3 số stop bit (0 = 1, 2 = 2), bit 4..7 parity (0 none, 1 odd, 2 even), bit 8..15 số data bit. */
    fun lineCtl(dataBits: Int, parity: String, stopBits: Int): Int {
      val p = when (parity) {
        "odd" -> 1
        "even" -> 2
        else -> 0
      }
      val s = if (stopBits == 2) 2 else 0
      return (dataBits shl 8) or (p shl 4) or s
    }
  }
}
