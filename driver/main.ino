void setup() {
  Serial.begin(115200);
}

void loop() {  
  if (Serial.available() > 0) {
    // Memory doesn't really matter here.
    String input = Serial.readStringUntil('\n');
    int newIdx = getNextToken(input, 0, ' ');
    String opcode = input.substring(0, newIdx);
    int lastIdx = newIdx + 1;

    newIdx = getNextToken(input, lastIdx, ' ');
    int plantID = input.substring(lastIdx, newIdx).toInt();
    lastIdx = newIdx + 1;

    unsigned long id = input.substring(lastIdx, input.length()).toInt();

    if (opcode == "MRPH") {
      switch(plantID) {
      case 0:
        break;
      case 1:
        break;
       case 2:
        Serial.print(id);
        Serial.print(" ");
        Serial.println(analogRead(A0));
      }
    }
  }
}

int getNextToken(String input, int startIdx, char delimeter) {
  for (int idx = startIdx; idx < input.length(); idx++) {
    if (input.charAt(idx) == ' ') {
      return idx;
    }
  }

  return input.length();
}
