plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val releaseStoreFile = providers.environmentVariable("STAFF_ANDROID_RELEASE_STORE_FILE").orNull
val releaseStorePassword = providers.environmentVariable("STAFF_ANDROID_RELEASE_STORE_PASSWORD").orNull
val releaseKeyAlias = providers.environmentVariable("STAFF_ANDROID_RELEASE_KEY_ALIAS").orNull
val releaseKeyPassword = providers.environmentVariable("STAFF_ANDROID_RELEASE_KEY_PASSWORD").orNull
val hasReleaseSigning = listOf(
    releaseStoreFile,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword
).all { !it.isNullOrBlank() }

android {
    namespace = "com.example.vaccinkid"
    compileSdk = 36

    defaultConfig {
        applicationId = "ma.vaccinikids.staff"
        minSdk = 24
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }


    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config"
            val emulatorApiUrl = "http://10.0.2.2:3000/api/"
            buildConfigField("String", "API_BASE_URL", "\"${emulatorApiUrl.trimEnd('/')}/\"")
        }

        create("debugEmulator") {
            initWith(getByName("debug"))
            matchingFallbacks += listOf("debug")
            manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config"

            val emulatorApiUrl = "http://10.0.2.2:3000/api/"
            buildConfigField("String", "API_BASE_URL", "\"${emulatorApiUrl.trimEnd('/')}/\"")
        }

        create("debugDevice") {
            initWith(getByName("debug"))
            matchingFallbacks += listOf("debug")
            manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config"

            val deviceApiUrl = providers.environmentVariable("STAFF_API_BASE_URL").orNull
            val buildsDeviceVariant = gradle.startParameter.taskNames.any {
                it.contains("debugDevice", ignoreCase = true)
            }
            require(!buildsDeviceVariant || !deviceApiUrl.isNullOrBlank()) {
                "STAFF_API_BASE_URL must be set for debugDevice builds (physical device). Example: STAFF_API_BASE_URL=http://<MAC_IP>:3000/api"
            }
            val configuredUrl = deviceApiUrl ?: "http://invalid.local/api/"
            buildConfigField("String", "API_BASE_URL", "\"${configuredUrl.trimEnd('/')}/\"")
        }

        release {
            val releaseApiUrl = providers.environmentVariable("STAFF_API_BASE_URL").orNull
                ?: "https://invalid.example/api/"
            buildConfigField("String", "API_BASE_URL", "\"${releaseApiUrl.trimEnd('/')}/\"")
            manifestPlaceholders["networkSecurityConfig"] = "@xml/network_security_config_release"
            if (hasReleaseSigning) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        buildConfig = true
    }
}

gradle.taskGraph.whenReady {
    if (allTasks.any { it.name.contains("Release") }) {
        val releaseApiUrl = providers.environmentVariable("STAFF_API_BASE_URL").orNull
        require(releaseApiUrl?.startsWith("https://") == true) {
            "STAFF_API_BASE_URL must be set to an HTTPS URL for release builds"
        }
        require(hasReleaseSigning) {
            "Staff release signing variables are required; debug signing is forbidden"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.fragment:fragment-ktx:1.8.3")
    implementation("androidx.viewpager2:viewpager2:1.1.0")
    implementation("androidx.cardview:cardview:1.0.0")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("com.github.PhilJay:MPAndroidChart:v3.1.0")
    // ✅ Corrigé : guillemets doubles pour Kotlin DSL
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    implementation("com.google.zxing:core:3.5.1")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.2")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.8.2")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    testImplementation("junit:junit:4.13.2")
    testImplementation("androidx.arch.core:core-testing:2.2.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.4.0")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
