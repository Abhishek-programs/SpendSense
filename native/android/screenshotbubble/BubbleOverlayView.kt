package com.screenshotbubble

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import kotlin.math.hypot

class BubbleOverlayView(
  context: Context,
  private val windowManager: WindowManager,
  private val onCaptureRequested: () -> Unit,
  private val onStopRequested: () -> Unit,
) : FrameLayout(context) {

  private val params = WindowManager.LayoutParams(
    dp(56),
    dp(56),
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    },
    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
    PixelFormat.TRANSLUCENT,
  ).apply {
    gravity = Gravity.TOP or Gravity.START
  }

  private var stopButton: TextView? = null
  private var touchStartX = 0f
  private var touchStartY = 0f
  private var paramStartX = 0
  private var paramStartY = 0
  private var isDragging = false

  init {
    background = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(Color.parseColor("#16A34A"))
    }
    isClickable = true
    isFocusable = true

    addView(
      TextView(context).apply {
        text = "◎"
        setTextColor(Color.WHITE)
        textSize = 22f
        gravity = Gravity.CENTER
      },
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT),
    )

    setOnLongClickListener {
      showStopButton()
      true
    }
  }

  fun attach() {
    val metrics = resources.displayMetrics
    params.x = metrics.widthPixels - dp(72)
    params.y = metrics.heightPixels / 2 - dp(28)
    windowManager.addView(this, params)
  }

  fun detach() {
    stopButton?.let { windowManager.removeView(it) }
    stopButton = null
    try {
      windowManager.removeView(this)
    } catch (_: IllegalArgumentException) {
    }
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        touchStartX = event.rawX
        touchStartY = event.rawY
        paramStartX = params.x
        paramStartY = params.y
        isDragging = false
        return true
      }

      MotionEvent.ACTION_MOVE -> {
        val dx = event.rawX - touchStartX
        val dy = event.rawY - touchStartY
        if (hypot(dx.toDouble(), dy.toDouble()) > 10) {
          isDragging = true
        }
        params.x = paramStartX + dx.toInt()
        params.y = paramStartY + dy.toInt()
        windowManager.updateViewLayout(this, params)
        return true
      }

      MotionEvent.ACTION_UP -> {
        if (!isDragging) {
          onCaptureRequested()
        } else {
          snapToEdge()
        }
        return true
      }
    }
    return super.onTouchEvent(event)
  }

  private fun showStopButton() {
    if (stopButton != null) return

    val btn = TextView(context).apply {
      text = "Stop bubble"
      setTextColor(Color.WHITE)
      textSize = 12f
      setPadding(dp(12), dp(8), dp(12), dp(8))
      background = GradientDrawable().apply {
        cornerRadius = dp(8).toFloat()
        setColor(Color.parseColor("#374151"))
      }
      setOnClickListener { onStopRequested() }
    }

    val stopParams = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      params.type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = params.x
      y = params.y - dp(48)
    }

    stopButton = btn
    windowManager.addView(btn, stopParams)
  }

  private fun snapToEdge() {
    val metrics = resources.displayMetrics
    val mid = metrics.widthPixels / 2
    val targetX = if (params.x + width / 2 < mid) dp(8) else metrics.widthPixels - width - dp(8)
    val startX = params.x

    ValueAnimator.ofInt(startX, targetX).apply {
      duration = 200
      addUpdateListener { animator ->
        params.x = animator.animatedValue as Int
        windowManager.updateViewLayout(this@BubbleOverlayView, params)
      }
      start()
    }
  }

  private fun dp(value: Int): Int =
    (value * resources.displayMetrics.density).toInt()
}
