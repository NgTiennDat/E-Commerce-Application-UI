type RouteParams = Record<string, string | undefined>

export type ParamsContext<TParams extends RouteParams = { id?: string }> = {
  params: TParams | Promise<TParams>
}

export async function resolveParams<TParams extends RouteParams>(
  context: ParamsContext<TParams>,
): Promise<TParams> {
  return await Promise.resolve(context.params)
}
