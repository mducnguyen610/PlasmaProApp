// Bản giả của DSL Expo Modules; chữ ký AsyncFunction chép từ node_modules/expo-modules-core (ObjectDefinitionBuilder.kt) để kiểm đúng cách chọn hàm nạp chồng.
@file:Suppress("UNUSED_PARAMETER", "FunctionName")
package expo.modules.kotlin.modules

import expo.modules.kotlin.Promise

import expo.modules.kotlin.AppContext

class ModuleDefinitionData

class ModuleDefinitionBuilder {
  fun Name(name: String) {}
  fun Events(vararg names: String) {}
  fun OnCreate(body: () -> Unit) {}
  fun OnDestroy(body: () -> Unit) {}
  @JvmName("AsyncFunctionWithoutArgs")
  inline fun AsyncFunction(
    name: String,
    crossinline body: () -> Any?
  ): Unit {}
  
  inline fun <reified R> AsyncFunction(
    name: String,
    crossinline body: () -> R
  ): Unit {}
  
  inline fun <reified R, reified P0> AsyncFunction(
    name: String,
    crossinline body: (p0: P0) -> R
  ): Unit {}
  
  inline fun <reified R, reified P0, reified P1> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1) -> R
  ): Unit {}
  @JvmName("AsyncFunctionWithPromise")
  inline fun <reified R, reified P0> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: Promise) -> R
  ): Unit {}
  
  inline fun <reified R, reified P0, reified P1, reified P2> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2) -> R
  ): Unit {}
  @JvmName("AsyncFunctionWithPromise")
  inline fun <reified R, reified P0, reified P1> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: Promise) -> R
  ): Unit {}
  
  inline fun <reified R, reified P0, reified P1, reified P2, reified P3> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: P3) -> R
  ): Unit {}
  @JvmName("AsyncFunctionWithPromise")
  inline fun <reified R, reified P0, reified P1, reified P2> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: Promise) -> R
  ): Unit {}
  
  inline fun <reified R, reified P0, reified P1, reified P2, reified P3, reified P4> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: P3, p4: P4) -> R
  ): Unit {}
  @JvmName("AsyncFunctionWithPromise")
  inline fun <reified R, reified P0, reified P1, reified P2, reified P3> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: P3, p4: Promise) -> R
  ): Unit {}
  
  inline fun <reified R, reified P0, reified P1, reified P2, reified P3, reified P4, reified P5> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5) -> R
  ): Unit {}
  @JvmName("AsyncFunctionWithPromise")
  inline fun <reified R, reified P0, reified P1, reified P2, reified P3, reified P4> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: P3, p4: P4, p5: Promise) -> R
  ): Unit {}
  
  inline fun <reified R, reified P0, reified P1, reified P2, reified P3, reified P4, reified P5, reified P6> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6) -> R
  ): Unit {}
  @JvmName("AsyncFunctionWithPromise")
  inline fun <reified R, reified P0, reified P1, reified P2, reified P3, reified P4, reified P5> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: Promise) -> R
  ): Unit {}
  
  inline fun <reified R, reified P0, reified P1, reified P2, reified P3, reified P4, reified P5, reified P6, reified P7> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7) -> R
  ): Unit {}
  @JvmName("AsyncFunctionWithPromise")
  inline fun <reified R, reified P0, reified P1, reified P2, reified P3, reified P4, reified P5, reified P6> AsyncFunction(
    name: String,
    crossinline body: (p0: P0, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: Promise) -> R
  ): Unit {}
}

fun ModuleDefinition(block: ModuleDefinitionBuilder.() -> Unit): ModuleDefinitionData = ModuleDefinitionData()

abstract class Module {
  val appContext: AppContext = AppContext()
  abstract fun definition(): ModuleDefinitionData
  fun sendEvent(name: String, body: Map<String, Any?>? = null) {}
}
