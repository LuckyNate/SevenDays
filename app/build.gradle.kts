plugins {
    id("com.android.application")
}

val buildNumber = System.getenv("BUILD_NUMBER")?.toIntOrNull() ?: 1
val buildName = System.getenv("BUILD_NAME") ?: "0.1.$buildNumber"

android {
    namespace = "com.prankdom.sevendays"
    compileSdk = 36

    signingConfigs {
        create("dev") {
            storeFile = file("sevendays-debug.keystore")
            storePassword = "sevendays"
            keyAlias = "sevendaysdebug"
            keyPassword = "sevendays"
        }
    }

    defaultConfig {
        applicationId = "com.prankdom.sevendays"
        minSdk = 33
        targetSdk = 36
        versionCode = buildNumber
        versionName = buildName
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("dev")
        }
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.17.0")
}
