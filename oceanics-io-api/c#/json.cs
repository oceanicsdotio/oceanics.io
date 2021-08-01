using System;
using System.Collections;
using System.Collections.Generic;

namespace neritics {

    public class json : Dictionary<string, dynamic> {
        // Transmit json serialized dictionary to controller.
        public void send(string status)  {

            var transmit = new json() {{"status", status}};
            foreach (var item in this)  {
                transmit[item.Key] = item.Value;
            }

            string data = "";
            try  {
                data = transmit.dumps();
            }
            catch  {
                error("Serialization", new json() {{"message", "serialize"}});
                System.Environment.Exit(1);
            }
            if (data.Length == 0) {
                error("Serialization", new json() {{"message", "no data to write"}});
                System.Environment.Exit(1);
            }
            try  {
                Console.WriteLine(data);
            }
            catch {
                System.Environment.Exit(1);
            }
        }

        // Catch bad key and exit
		public void validate(string key){
			try  {
                var temp = this[key];
            }
            catch {
                error("Key", new json() {{"message", key}});
                System.Environment.Exit(1);
            }
		}

        public string dumps()  {
            var items = new List<String>();
            foreach (var item in this)
            {
                items.Add("\"" + item.Key + "\":" + as_string(item.Value));
            }
            return "{" + String.Join(",", items) + "}";
        }

        public void update(json newValues) {
            foreach (var item in newValues)  {
                if (item.Key != "status") {
                    this.validate(item.Key);
                    this[item.Key] = item.Value;
                }
            }
        }

        public static json receive() {

            string data = "";
            try { data = Console.ReadLine().Trim(); }
            catch {
                error("Deserialization", new json() {{"message", "reading from console"}});
                System.Environment.Exit(1);
            }

            if (data.Equals("")) {
                error("Deserialization", new json() {{"message", "no data"}});
                System.Environment.Exit(1);
            }

            var dict = new json();
            if (!data.Equals("'{}'")) {
                try { dict = loads(data.Trim()); }
                catch {
                    error("Deserialization", new json() {{"message", data.Trim()}});
                    System.Environment.Exit(1);
                }
            }
            return dict;
        }

        public static void error(string type, json message) {
            message.Add("error", type + "Error");
            message.send("error");
        }

        //Convert json string to dictionary
        public static json loads(string data) {
            var result = new json();
            int start = data.IndexOf("{");
            int end = data.LastIndexOf("}");

            string array = data.Substring(start+1, end-start-1); // split into array of items

            foreach (string item in array.Split(','))
            {
                string[] pair = item.Replace("_", " ").Replace("\"", string.Empty).Split(':'); // split into pair

                result.Add(pair[0], fmt_value(pair[1]));
            }

            return result;
        }

        private static dynamic fmt_value(string value) {

            if (float.TryParse(value, out float floatValue)) {
                return floatValue;
            }
            return value;
        }

        private static string as_string(dynamic value, int precision=10) {

            if (value is json) {
                return "NestedJSON"; // TODO: recursively parse deeper levels
            }

            if (value is double) {
                string fmt = "{0:0.0" + new String('#', precision - 1) + "}";
                return String.Format(fmt, value);
            }

            if (value is string) {
                if (value.Contains("{") && value.Contains(":") && value.Contains("}")) { return value; }
                else { return "\"" + value + "\""; }
            }

            try { return value.ToString(); }
            catch { return "BadValue"; }
        }
    }
}