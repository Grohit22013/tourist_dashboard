// import 'package:connectivity_plus/connectivity_plus.dart';
// import 'package:internet_connection_checker/internet_connection_checker.dart';

// class NetworkService {
//   static Stream<Map<String, String>> networkStatusStream() {
//     return Connectivity().onConnectivityChanged.asyncMap((results) async {
//       bool hasInternet = await InternetConnectionChecker().hasConnection;

//       String connectionType = "Offline";

//       if (results.contains(ConnectivityResult.wifi)) connectionType = "WiFi";
//       if (results.contains(ConnectivityResult.mobile))
//         connectionType = "Mobile Data";
//       if (results.contains(ConnectivityResult.ethernet))
//         connectionType = "Ethernet";

//       return {"status": hasInternet ? "1" : "0", "type": connectionType};
//     });
//   }
// }

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:internet_connection_checker/internet_connection_checker.dart';

class NetworkService {
  /// 🔁 Stream when you want continuous monitoring
  static Stream<Map<String, String>> networkStatusStream() {
    return Connectivity().onConnectivityChanged.asyncMap((results) async {
      bool hasInternet = await InternetConnectionChecker().hasConnection;

      String connectionType = "Offline";

      if (results.contains(ConnectivityResult.wifi)) connectionType = "WiFi";
      if (results.contains(ConnectivityResult.mobile))
        connectionType = "Mobile Data";
      if (results.contains(ConnectivityResult.ethernet))
        connectionType = "Ethernet";

      return {"status": hasInternet ? "1" : "0", "type": connectionType};
    });
  }

  /// 🔍 Check network status **once** (NO STREAM LISTENING)
  static Future<Map<String, String>> checkStatusOnce() async {
    var connectivity = await Connectivity().checkConnectivity();
    bool hasInternet = await InternetConnectionChecker().hasConnection;

    String connectionType = "Offline";

    if (connectivity.contains(ConnectivityResult.wifi)) connectionType = "WiFi";
    if (connectivity.contains(ConnectivityResult.mobile))
      connectionType = "Mobile Data";
    if (connectivity.contains(ConnectivityResult.ethernet))
      connectionType = "Ethernet";

    return {"status": hasInternet ? "1" : "0", "type": connectionType};
  }
}
