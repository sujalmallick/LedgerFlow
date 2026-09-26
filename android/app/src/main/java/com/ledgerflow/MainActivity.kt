package com.ledgerflow

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "LedgerFlow"

  /**
   * Use DefaultReactActivityDelegate with fabricEnabled = false (Old Architecture).
   * Note: Do NOT import DefaultNewArchitectureEntryPoint when New Architecture is disabled —
   * that import can trigger ClassNotFoundException on some Android OEM ROMs (MIUI, ColorOS).
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, false)

  /**
   * Required by react-native-screens: pass null to prevent a crash when the OS tries to
   * restore a Navigation back-stack state that was saved before the app process was killed.
   * See: https://github.com/software-mansion/react-native-screens/issues/17
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}

