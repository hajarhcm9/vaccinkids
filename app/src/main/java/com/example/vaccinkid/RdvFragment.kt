package com.example.vaccinkid

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.tabs.TabLayout
import com.google.android.material.tabs.TabLayoutMediator
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RdvFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_rdv, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Sous-titre avec date
        val sdf = SimpleDateFormat("dd MMMM yyyy", Locale.FRENCH)
        view.findViewById<TextView>(R.id.tvRdvSubtitle).text =
            "Semaine du ${sdf.format(Date())}"

        // ViewPager2 + Tabs
        val viewPager = view.findViewById<ViewPager2>(R.id.viewPagerRdv)
        val tabLayout = view.findViewById<TabLayout>(R.id.tabLayoutRdv)

        viewPager.adapter = RdvPagerAdapter(this)

        TabLayoutMediator(tabLayout, viewPager) { tab, position ->
            tab.text = when (position) {
                0 -> "Aujourd'hui"
                1 -> "Cette semaine"
                else -> ""
            }
        }.attach()
    }
}