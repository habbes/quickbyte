using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
namespace Quickbyte;

public class ApiClient
{
	HttpClient client;

	public ApiClient(string accessToken) : this(accessToken, new HttpClient())
	{
	}

	public ApiClient(string accessToken, HttpClient httpClient)
	{
		this.client = httpClient;
		this.client.BaseAddress = new Uri("http://localhost:3000/api");
		this.client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
	}

	public async Task<UserWithAccount> GetMe()
	{
		var response = await this.client.GetAsync("/me");
		var result = await Serialize<UserWithAccount>(response);
		return result;
	}

	public async Task<FileInitResponse> InitFile(string account, FileInitRequest request)
	{
		var requestUri = $"/accounts/{account}/files";
		var body = JsonSerializer.Serialize(request,
			new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
		);
		var content = new StringContent(body, Encoding.UTF8, new MediaTypeHeaderValue("application/json"));
		var response = await this.client.PostAsync(requestUri, content);
		var responseStream = await response.Content.ReadAsStreamAsync();
		var result = JsonSerializer.Deserialize<FileInitResponse>(responseStream, new JsonSerializerOptions
		{
			PropertyNamingPolicy = JsonNamingPolicy.CamelCase
		});

		return result;
	}

	public async Task<DownloadRequestResponse> RequestDownload(string accountId, string fileId)
	{
		var response = await this.client.GetAsync($"/accounts/{accountId}/files/{fileId}/download");
		var result = await Serialize<DownloadRequestResponse>(response);
		return result;
	}

	private async Task<T> Serialize<T>(HttpResponseMessage response)
	{
        var responseStream = await response.Content.ReadAsStreamAsync();
        var result = JsonSerializer.Deserialize<T>(responseStream, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

		return result;
    }
}

