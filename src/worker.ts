type TWorkerCtxEnv = {
  API_GATEWAY_URL: string
  FORMATED_IMG_URL_PREFIX: string
  ORIGIN_IMG_URL_PREFIX: string
}

const API_GATEWAY_URL = "string" //need to specify
const FORMATED_IMG_URL_PREFIX = "string" //need to specify
const ORIGIN_IMG_URL_PREFIX = "string" //need to specify

const allowedWidth: number[] = [1170, 970, 750, 320]
const allowedHeight: number[] = []
const bypassFormat: string[] = []
const isAllowedQuality = (quality: number): boolean => quality > 0 && quality <= 100
const handle = async (event: FetchEvent) => {
  const env: TWorkerCtxEnv = { API_GATEWAY_URL, FORMATED_IMG_URL_PREFIX, ORIGIN_IMG_URL_PREFIX }
  const url = new URL(event.request.url)
  if (url.pathname.startsWith("/example")) {
    return new Response(getExample(), { headers: { "content-type": "text/html" } })
  }
  const img_props = parsePath(url.pathname)

  const pathnameSplit = url.pathname.split(".")
  const format = pathnameSplit[pathnameSplit.length - 1]

  if (bypassFormat.includes(format)) {
    const image_src =
      url.searchParams.get("image_src") ||
      `${env.ORIGIN_IMG_URL_PREFIX}/${encodeURIComponent(img_props.oldKey)}`
    const cache: Cache = (caches as any).default
    const cahed_responce = await cache.match(image_src)
    if (cahed_responce) {
      return cahed_responce
    }
    let origin_response = await fetch(image_src)
    if (!origin_response.ok) {
      return origin_response
    }
    const headers = new Headers(origin_response.headers)
    headers.delete("set-cookie")
    headers.set("Cache-Control", "max-age=31536000")
    const responce_clone = new Response(origin_response.clone().body, {
      headers,
    })
    event.waitUntil(cache.put(image_src, responce_clone.clone()))
    return responce_clone
  }

  if (
    (img_props.width && !allowedWidth.includes(img_props.width)) ||
    (img_props.height && !allowedHeight.includes(img_props.height)) ||
    (img_props.quality && !isAllowedQuality(img_props.quality))
  ) {
    return new Response("Not allowed image properties", { status: 404 })
  }
  const formated_target_url =
    env.FORMATED_IMG_URL_PREFIX + changeExt(createNewKey(img_props), img_props.format)
  const cache: Cache = (caches as any).default
  const cahed_responce = await cache.match(formated_target_url)
  if (cahed_responce) {
    return cahed_responce
  }
  let origin_response = await fetch(formated_target_url)
  if (!origin_response.ok) {
    const image_src =
      url.searchParams.get("image_src") ||
      `${env.ORIGIN_IMG_URL_PREFIX}/${encodeURIComponent(img_props.oldKey)}`
    const gateWayUrl = env.API_GATEWAY_URL + "?" + createSarchParams(img_props, image_src)
    origin_response = await fetch(gateWayUrl)
  }
  if (!origin_response.ok) {
    return origin_response
  }
  const headers = new Headers(origin_response.headers)
  headers.delete("set-cookie")
  headers.set("Cache-Control", "max-age=31536000")
  const responce_clone = new Response(origin_response.clone().body, {
    headers,
  })
  event.waitUntil(cache.put(formated_target_url, responce_clone.clone()))
  return responce_clone
}

export const trimParam = (predicate: string, param: string | undefined): string | null => {
  return param ? param.replace(predicate, "") : null
}
const predicates = ["f_", "w_", "h_", "q_"]

type TImgProps = {
  format: string | null
  width: number | null
  height: number | null
  quality: number | null
  key: string
  oldKey: string
}

export const parsePath = (image_pathname: string): TImgProps => {
  const path_arr = image_pathname.slice(1).split("/")
  const params_arr = path_arr[0].split("-")
  const [format, width, height, quality] = predicates.map(predicate => {
    return trimParam(
      predicate,
      params_arr.find(p => p.startsWith(predicate))
    )
  })
  const oldKey = path_arr.slice(1).join("/")
  const key = changeExt(oldKey, format)
  return {
    format,
    width: width ? Number(width) : null,
    height: height ? Number(height) : null,
    quality: quality ? Number(quality) : null,
    key,
    oldKey,
  }
}

const createNewKey = ({ width, height, format, key, quality }: TImgProps) => {
  let result = "/"
  if (format) {
    result += `f_${format}`
  }
  if (width) {
    if (result) {
      result += "-"
    }
    result += `w_${width}`
  }
  if (height) {
    if (result) {
      result += "-"
    }
    result += `h_${height}`
  }
  if (quality) {
    if (result) {
      result += "-"
    }
    result += `q_${quality}`
  }

  return `${result}/${key}`
}

export const changeExt = (keyName: string, newExt: string | null): string => {
  const keyArr = keyName.split(".")
  if (newExt) {
    if (keyArr.length > 1) {
      keyArr[keyArr.length - 1] = newExt
    } else keyArr.push(newExt)
  }
  return keyArr.join(".")
}

export const createSarchParams = (params: TImgProps, image_src: string): string => {
  const { format, width, height, key, quality } = params
  return `${format ? "format=" + format + "&" : ""}${width ? "width=" + width + "&" : ""}${
    height ? "height=" + height + "&" : ""
  }${quality ? "quality=" + quality + "&" : ""}key=${key}${
    image_src ? "&image_src=" + image_src : ""
  }`
}

const try_catch_handler = async (event: FetchEvent) => {
  try {
    const response = await handle(event)
    return response
  } catch (err) {
    return new Response(err.stack || err)
  }
}
;((global as unknown) as ServiceWorkerGlobalScope).addEventListener("fetch", event => {
  event.respondWith(try_catch_handler(event))
})

const getExample = () =>
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Document</title>
  </head>
  <body style="margin:0">
    <picture>
      <source
        srcSet="https://img-proxy.palessit.dev/w_1170-f_webp-q_100/daniel.jpg 1170w,
        https://img-proxy.palessit.dev/w_970-f_webp/daniel.jpg 970w,
        https://img-proxy.palessit.dev/w_750-f_webp/daniel.jpg 750w,
        https://img-proxy.palessit.dev/w_320-f_webp/daniel.jpg 320w"
        type="image/webp"/>
      <source
        srcSet="https://img-proxy.palessit.dev/w_1170/daniel.jpg 1170w,
        https://img-proxy.palessit.dev/w_970/daniel.jpg 970w,
        https://img-proxy.palessit.dev/w_750/daniel.jpg 750w,
        https://img-proxy.palessit.dev/w_320/daniel.jpg 320w"/>
      <img src="https://img-proxy.palessit.dev/f_jpeg/daniel.jpg" alt="1"
    /></picture>
  </body>
</html>`
