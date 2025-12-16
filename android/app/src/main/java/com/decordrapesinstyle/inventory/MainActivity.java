package com.decordrapesinstyle.inventory;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Allow Android to control status bar correctly
    getWindow().setStatusBarColor(0xFF000000);
  }
}
