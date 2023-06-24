using System;
using System.Text.Json;
namespace Quickbyte;

public record struct Block(int Index, string Id);

public record FileInitResponse(string Container, string Path, string SecureUploadUrl, string OriginalName, string Provider, string Region);

public record FileInitRequest(
    string Provider, string Region, string OriginalName);