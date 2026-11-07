// Ambient declarations for Web Bluetooth API
interface BluetoothRemoteGATTCharacteristic {
  uuid: string;
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
    read?: boolean;
    notify?: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
  readValue(): Promise<DataView>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(
    type: 'gattserverdisconnected',
    listener: (this: BluetoothDevice, ev: Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
}

interface BluetoothRequestDeviceOptions {
  filters?: Array<{ services?: Array<string | number>; name?: string; namePrefix?: string }>;
  optionalServices?: Array<string | number>;
  acceptAllDevices?: boolean;
}

interface Bluetooth {
  requestDevice(options?: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
  getAvailability?(): Promise<boolean>;
}

interface Navigator {
  bluetooth?: Bluetooth;
}
