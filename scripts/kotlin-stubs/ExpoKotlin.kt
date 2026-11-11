// Bản giả tối thiểu của expo.modules.kotlin.Promise và AppContext, chỉ để kiểm kiểu mã mô-đun gốc khi không có Android SDK.
@file:Suppress("UNUSED_PARAMETER")
package expo.modules.kotlin

interface Promise {
  fun resolve(value: Any?)
  fun reject(code: String, message: String?, cause: Throwable?)
}

class AppContext {
  val reactContext: android.content.Context? = null
}
