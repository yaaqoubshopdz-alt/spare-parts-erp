import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService, AIConfig, AIMessage } from '../electron/services/ai.service';
import https from 'https';
import EventEmitter from 'events';

vi.mock('https');

describe('AIService tests', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockResponse = new EventEmitter();
    mockResponse.statusCode = 200;
    
    mockRequest = new EventEmitter();
    mockRequest.write = vi.fn();
    mockRequest.end = vi.fn();
    mockRequest.setTimeout = vi.fn();
    mockRequest.destroy = vi.fn();

    vi.spyOn(https, 'request').mockImplementation((options, callback) => {
      if (callback) {
        callback(mockResponse);
      }
      return mockRequest as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully parse Gemini response', async () => {
    const config: AIConfig = {
      provider: 'gemini',
      apiKey: 'test-api-key',
    };
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are an assistant.' },
      { role: 'user', content: 'Hello' },
    ];

    const mockResponseData = JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: 'Hello! I am your AI assistant.' }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 15,
        totalTokenCount: 25,
      },
    });

    const promise = AIService.chat(config, messages);

    // Simulate response data chunks
    mockResponse.emit('data', mockResponseData);
    mockResponse.emit('end');

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.content).toBe('Hello! I am your AI assistant.');
    expect(result.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 15,
      total_tokens: 25,
    });
  });

  it('should successfully parse OpenAI compatibility response', async () => {
    const config: AIConfig = {
      provider: 'openai',
      apiKey: 'test-api-key',
    };
    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello' },
    ];

    const mockResponseData = JSON.stringify({
      choices: [
        {
          message: {
            content: 'Hello from OpenAI!',
          },
        },
      ],
      usage: {
        prompt_tokens: 8,
        completion_tokens: 12,
        total_tokens: 20,
      },
    });

    const promise = AIService.chat(config, messages);

    // Simulate response data chunks
    mockResponse.emit('data', mockResponseData);
    mockResponse.emit('end');

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.content).toBe('Hello from OpenAI!');
    expect(result.usage).toEqual({
      prompt_tokens: 8,
      completion_tokens: 12,
      total_tokens: 20,
    });
  });

  it('should handle HTTP failure codes correctly', async () => {
    mockResponse.statusCode = 500;
    const mockErrorData = JSON.stringify({
      error: {
        message: 'Internal Server Error',
      },
    });

    const config: AIConfig = {
      provider: 'gemini',
      apiKey: 'test-api-key',
    };
    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello' },
    ];

    const promise = AIService.chat(config, messages);

    mockResponse.emit('data', mockErrorData);
    mockResponse.emit('end');

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Internal Server Error');
  });

  it('should construct correct Gemini request payload with image', async () => {
    const config: AIConfig = {
      provider: 'gemini',
      apiKey: 'test-api-key',
    };
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: 'Hello with image',
        image: {
          base64: 'iVBORw0KGgoAAA...',
          mimeType: 'image/png',
        },
      },
    ];

    const mockResponseData = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'I see your image' }] } }],
    });

    const promise = AIService.chat(config, messages);

    mockResponse.emit('data', mockResponseData);
    mockResponse.emit('end');

    await promise;

    expect(mockRequest.write).toHaveBeenCalled();
    const sentPayload = JSON.parse(mockRequest.write.mock.calls[0][0]);
    expect(sentPayload.contents[0].parts[0].text).toBe('Hello with image');
    expect(sentPayload.contents[0].parts[1].inlineData).toEqual({
      mimeType: 'image/png',
      data: 'iVBORw0KGgoAAA...',
    });
  });

  it('should construct correct OpenAI compatibility request payload with image', async () => {
    const config: AIConfig = {
      provider: 'openai',
      apiKey: 'test-api-key',
    };
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: 'Hello with image',
        image: {
          base64: 'iVBORw0KGgoAAA...',
          mimeType: 'image/png',
        },
      },
    ];

    const mockResponseData = JSON.stringify({
      choices: [{ message: { content: 'I see your image' } }],
    });

    const promise = AIService.chat(config, messages);

    mockResponse.emit('data', mockResponseData);
    mockResponse.emit('end');

    await promise;

    expect(mockRequest.write).toHaveBeenCalled();
    const sentPayload = JSON.parse(mockRequest.write.mock.calls[0][0]);
    expect(sentPayload.messages[0].content).toEqual([
      { type: 'text', text: 'Hello with image' },
      {
        type: 'image_url',
        image_url: {
          url: 'data:image/png;base64,iVBORw0KGgoAAA...',
        },
      },
    ]);
  });

  it('should include chat_template_kwargs: { thinking: false } for DeepSeek models on Nvidia provider', async () => {
    const config: AIConfig = {
      provider: 'nvidia',
      apiKey: 'test-api-key',
      model: 'deepseek-ai/deepseek-v4-pro',
    };
    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello' },
    ];

    const mockResponseData = JSON.stringify({
      choices: [{ message: { content: 'DeepSeek reply' } }],
    });

    const promise = AIService.chat(config, messages);

    mockResponse.emit('data', mockResponseData);
    mockResponse.emit('end');

    await promise;

    expect(mockRequest.write).toHaveBeenCalled();
    const sentPayload = JSON.parse(mockRequest.write.mock.calls[0][0]);
    expect(sentPayload.chat_template_kwargs).toEqual({ thinking: false });
  });

  // The generateImage feature has been removed, so this test is no longer needed.
  // it('should construct correct request payload for generateImage using NVIDIA provider', async () => {
  //   const config: AIConfig = {
  //     provider: 'nvidia',
  //     apiKey: 'test-api-key',
  //   };
  //   const mockResponseData = JSON.stringify({
  //     artifacts: [
  //       {
  //         base64: 'iVBORw0KGgoAAAANSUhEUg...',
  //       },
  //     ],
  //   });
  // 
  //   const promise = AIService.generateImage(config, 'A beautiful car part');
  // 
  //   mockResponse.emit('data', mockResponseData);
  //   mockResponse.emit('end');
  // 
  //   const result = await promise;
  // 
  //   expect(result.success).toBe(true);
  //   expect(result.content).toBe('iVBORw0KGgoAAAANSUhEUg...');
  //   expect(mockRequest.write).toHaveBeenCalled();
  //   
  //   const sentPayload = JSON.parse(mockRequest.write.mock.calls[0][0]);
  //   expect(sentPayload).toEqual({
  //     prompt: 'A beautiful car part',
  //     width: 1024,
  //     height: 1024,
  //   });
  // });
});

