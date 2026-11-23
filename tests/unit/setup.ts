import "fake-indexeddb/auto";

class FakeDataTransfer {
  private list: File[] = [];
  items = { add: (f: File) => void this.list.push(f) };
  get files() {
    const files = this.list;
    return Object.assign(files.slice(), { item: (i: number) => files[i] ?? null }) as unknown as FileList;
  }
}
Object.assign(globalThis, { DataTransfer: FakeDataTransfer });
