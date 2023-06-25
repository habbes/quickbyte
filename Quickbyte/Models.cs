using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Quickbyte;

public record struct Block(int Index, string Id);

public record FileInitResponse(
    [property: JsonPropertyName("_id")] string Id,
    string Container, string Path, string SecureUploadUrl, string OriginalName, string Provider, string Region);

public record FileInitRequest(
    string Provider, string Region, string OriginalName);

public record UserWithAccount([property: JsonPropertyName("_id")] string Id, Account Account);
public record Account([property: JsonPropertyName("_id")]  string Id);

public record DownloadRequestResponse(
    [property: JsonPropertyName("_id")] string Id,
    string DownloadUrl);