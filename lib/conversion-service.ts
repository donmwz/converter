const normalizedServiceUrl = () => process.env.CONVERSION_SERVICE_URL?.replace(/\/$/, "");

export function hasConversionService() {
  return Boolean(normalizedServiceUrl());
}

export function isAuthorizedConversionServiceRequest(request: Request) {
  const token = process.env.CONVERSION_SERVICE_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${token}`;
}

export async function forwardToConversionService(request: Request, path: string) {
  const serviceUrl = normalizedServiceUrl();
  const token = process.env.CONVERSION_SERVICE_TOKEN;
  if (!serviceUrl || !token) {
    return Response.json(
      { error: "Dönüşüm hizmeti yapılandırılmamış." },
      { status: 503 }
    );
  }

  const response = await fetch(`${serviceUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: await request.formData(),
    cache: "no-store",
  });

  const headers = new Headers();
  for (const name of ["content-type", "content-disposition", "cache-control"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}
