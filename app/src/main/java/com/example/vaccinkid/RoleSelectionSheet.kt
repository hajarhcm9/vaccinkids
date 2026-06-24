package com.example.vaccinkid

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.card.MaterialCardView

class RoleSelectionSheet : BottomSheetDialogFragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_role_selection_sheet, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Expand the sheet fully on appear
        (dialog as? BottomSheetDialog)?.behavior?.apply {
            state = BottomSheetBehavior.STATE_EXPANDED
            skipCollapsed = true
        }

        view.findViewById<MaterialCardView>(R.id.cardRoleInfirmier).setOnClickListener {
            dismiss()
            requireActivity().startActivity(
                Intent(requireContext(), LoginInfirmierActivity::class.java)
            )
            requireActivity().finish()
        }

        view.findViewById<MaterialCardView>(R.id.cardRoleAdmin).setOnClickListener {
            dismiss()
            requireActivity().startActivity(
                Intent(requireContext(), AdminLoginActivity::class.java)
            )
            requireActivity().finish()
        }
    }

}
