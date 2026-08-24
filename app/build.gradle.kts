plugins {
    id("com.android.application")
}

android {
    namespace = "com.prankdom.sevendays"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.prankdom.sevendays"
        minSdk = 33
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.17.0")
}
