package com.example.vaccinkid

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.core.view.setPadding
import androidx.recyclerview.widget.RecyclerView

object StaffUi {
    const val BACKGROUND = 0xFFF4F7F6.toInt()
    const val SURFACE = 0xFFFFFFFF.toInt()
    const val PRIMARY = 0xFF087F73.toInt()
    const val PRIMARY_DARK = 0xFF075E57.toInt()
    const val CORAL = 0xFFE85D5D.toInt()
    const val AMBER = 0xFFF2B84B.toInt()
    const val INK = 0xFF17332F.toInt()
    const val MUTED = 0xFF637773.toInt()
    const val BORDER = 0xFFD8E4E1.toInt()
    const val DANGER = 0xFFB93838.toInt()
    const val SOFT_TEAL = 0xFFE3F3F0.toInt()
    const val SOFT_CORAL = 0xFFFFE9E5.toInt()

    fun decorateScreen(root: View) {
        root.setBackgroundColor(BACKGROUND)
        decorateTree(root)
    }

    fun decorateTree(view: View) {
        when (view) {
            is Button -> styleButton(view)
            is EditText -> styleInput(view)
            is Spinner -> {
                view.background = rounded(SURFACE, BORDER, 6)
                view.setPadding(dp(view.context, 12))
            }
            is RecyclerView -> {
                view.setPadding(0, dp(view.context, 6), 0, dp(view.context, 18))
                view.clipToPadding = false
            }
            is TextView -> {
                val scaledDensity = view.resources.displayMetrics.density *
                    view.resources.configuration.fontScale
                if (view.textSize / scaledDensity >= 20f) {
                    styleTitle(view)
                } else if (view.currentTextColor == Color.BLACK || view.currentTextColor == Color.DKGRAY) {
                    view.setTextColor(INK)
                }
            }
        }
        if (view is ViewGroup) {
            for (index in 0 until view.childCount) decorateTree(view.getChildAt(index))
        }
    }

    fun styleTitle(view: TextView) {
        view.setTextColor(INK)
        view.textSize = 24f
        view.setTypeface(view.typeface, Typeface.BOLD)
    }

    fun styleSubtitle(view: TextView) {
        view.setTextColor(MUTED)
        view.textSize = 13f
    }

    fun styleButton(button: Button, emphasis: Boolean = false) {
        val label = button.text.toString().lowercase()
        val destructive = listOf("annuler", "desactiver", "fermer", "gaspillage").any(label::contains)
        val quiet = listOf("rafraichir", "precedent", "suivant", "filtrer", "carnet").any(label::contains)
        val background = when {
            destructive -> SOFT_CORAL
            quiet && !emphasis -> SURFACE
            else -> PRIMARY
        }
        button.backgroundTintList = ColorStateList.valueOf(background)
        button.setTextColor(
            when {
                destructive -> DANGER
                quiet && !emphasis -> PRIMARY_DARK
                else -> Color.WHITE
            }
        )
        button.isAllCaps = false
        button.textSize = 13f
        button.setTypeface(button.typeface, Typeface.BOLD)
        button.minHeight = dp(button.context, 48)
        button.stateListAnimator = null
        button.background = rounded(background, if (quiet && !emphasis) BORDER else background, 7)
    }

    fun styleInput(input: EditText) {
        input.setTextColor(INK)
        input.setHintTextColor(MUTED)
        input.textSize = 14f
        input.setPadding(dp(input.context, 14), dp(input.context, 11), dp(input.context, 14), dp(input.context, 11))
        input.background = rounded(SURFACE, BORDER, 6)
        val params = input.layoutParams
        if (params is ViewGroup.MarginLayoutParams) {
            params.bottomMargin = dp(input.context, 8)
            input.layoutParams = params
        }
    }

    fun styleCard(view: View, accent: Int? = null) {
        view.background = rounded(SURFACE, accent ?: BORDER, 7)
        view.elevation = dp(view.context, 1).toFloat()
        if (view is LinearLayout) {
            view.setPadding(dp(view.context, 14))
        }
        val params = view.layoutParams
        if (params is ViewGroup.MarginLayoutParams) {
            params.bottomMargin = dp(view.context, 9)
            view.layoutParams = params
        }
    }

    fun statusPill(view: TextView, status: String?) {
        val color = when (status?.uppercase()) {
            "PRESENT", "CONFIRMEE", "ACTIF", "EN_COURS" -> PRIMARY
            "ABSENT", "ANNULEE", "INACTIF", "FERME" -> DANGER
            else -> 0xFF9A6700.toInt()
        }
        val soft = when (color) {
            PRIMARY -> SOFT_TEAL
            DANGER -> SOFT_CORAL
            else -> 0xFFFFF3D6.toInt()
        }
        view.setTextColor(color)
        view.textSize = 11f
        view.setTypeface(view.typeface, Typeface.BOLD)
        view.background = rounded(soft, soft, 20)
        view.setPadding(dp(view.context, 9), dp(view.context, 4), dp(view.context, 9), dp(view.context, 4))
    }

    fun rounded(fill: Int, stroke: Int, radiusDp: Int): GradientDrawable =
        GradientDrawable().apply {
            setColor(fill)
            cornerRadius = radiusDp.toFloat()
            setStroke(1, stroke)
        }

    fun dp(context: Context, value: Int): Int =
        (value * context.resources.displayMetrics.density).toInt()
}
