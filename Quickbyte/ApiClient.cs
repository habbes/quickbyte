using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
namespace Quickbyte;

public class ApiClient
{
	HttpClient client;

	public ApiClient() : this(new HttpClient())
	{
	}

	public ApiClient(HttpClient httpClient)
	{
		this.client = httpClient;
	}

	public async Task<FileInitResponse> InitFile(string account, FileInitRequest request)
	{
		var requestUri = $"http://localhost:3000/accounts/{account}/files";
		var body = JsonSerializer.Serialize(request,
			new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
		);
		var content = new HttpStringContent(body, Encoding.UTF8, mediaType: "application/json");
		var response = await this.client.PostAsync(requestUri, content);
		var responseStream = await response.ReadAsStreamAsync();
		var result = JsonSerializer.Deserialize<FileInitResponse>(responseStream, new JsonSerializerOptions
		{
			PropertyNamingPolicy = JsonNamingPolicy.CamelCase
		});

		return result;
	}
}

