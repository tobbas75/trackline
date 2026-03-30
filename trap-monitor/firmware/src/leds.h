#pragma once
#include <Arduino.h>
#include "config.h"

enum LedColor { LED_GREEN, LED_AMBER, LED_RED, LED_ALL };
enum LedMode  { OFF, BLINK_SLOW, BLINK_FAST, BLINK_1X, BLINK_3X, BLINK_SOLID };

void ledsInit() {
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_AMBER_PIN, OUTPUT);
  pinMode(LED_RED_PIN,   OUTPUT);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_AMBER_PIN, LOW);
  digitalWrite(LED_RED_PIN,   LOW);
}

void ledSet(LedColor color, LedMode mode) {
  int pin = (color == LED_GREEN) ? LED_GREEN_PIN :
            (color == LED_AMBER) ? LED_AMBER_PIN : LED_RED_PIN;

  switch (mode) {
    case OFF:
      if (color == LED_ALL) {
        digitalWrite(LED_GREEN_PIN, LOW);
        digitalWrite(LED_AMBER_PIN, LOW);
        digitalWrite(LED_RED_PIN,   LOW);
      } else {
        digitalWrite(pin, LOW);
      }
      break;
    case BLINK_SOLID:
      digitalWrite(pin, HIGH);
      break;
    case BLINK_1X:
      digitalWrite(pin, HIGH); delay(200);
      digitalWrite(pin, LOW);
      break;
    case BLINK_3X:
      for (int i = 0; i < 3; i++) {
        digitalWrite(pin, HIGH); delay(150);
        digitalWrite(pin, LOW);  delay(150);
      }
      break;
    case BLINK_FAST:
      for (int i = 0; i < 6; i++) {
        digitalWrite(pin, HIGH); delay(100);
        digitalWrite(pin, LOW);  delay(100);
      }
      break;
    case BLINK_SLOW:
      digitalWrite(pin, HIGH); delay(500);
      digitalWrite(pin, LOW);
      break;
  }
}
