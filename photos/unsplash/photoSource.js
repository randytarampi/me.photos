require("dotenv").config();
require("isomorphic-fetch");

const PhotoSource = require("../photoSource");
const Photo = require("me.common.js/lib/photo");
const Creator = require("me.common.js/lib/creator");
const SizedPhoto = require("me.common.js/lib/sizedPhoto");
const SearchParams = require("../searchParams");
const Unsplash = require("unsplash-js").default;
const toJson = require("unsplash-js").toJson;
const url = require("url");

class UnsplashSource extends PhotoSource {
	constructor() {
		super("Unsplash", new Unsplash({
			applicationId: process.env.UNSPLASH_API_KEY,
			secret: process.env.UNSPLASH_API_SECRET
		}));
	}

	getUserPhotos(params) {
		params = params instanceof SearchParams ? params : new SearchParams(params);
		const unsplashRequest = this.client.users.photos(process.env.UNSPLASH_USER_NAME, params.page, params.perPage, params.orderBy);

		return unsplashRequest
			.then(toJson)
			.then((response) => {
				return Promise.all(response.map((photo) => {
					return this.getPhoto(photo.id);
				}));
			});
	}

	getPhoto(photoId, params) {
		params = params instanceof SearchParams ? params : new SearchParams(params);
		return this.client.photos.getPhoto(photoId, params.width, params.height, params.crop)
			.then(toJson)
			.then((photo) => {
				return this.jsonToPhoto(photo);
			});
	}

	jsonToPhoto(json) {
		return new Photo(
			json.id,
			null,
			this.type,
			json.created_at,
			null,
			json.width,
			json.height,
			[
				new SizedPhoto(json.urls.raw, json.width, json.height, "raw"),
				new SizedPhoto(json.urls.full, json.width, json.height, "full"),
				new SizedPhoto(buildSizedImageUrl(json.urls.raw, 1920), 1920),
				new SizedPhoto(buildSizedImageUrl(json.urls.raw, 1440), 1440),
				new SizedPhoto(buildSizedImageUrl(json.urls.raw, 720), 720),
				new SizedPhoto(buildSizedImageUrl(json.urls.raw, 640), 640),
				new SizedPhoto(buildSizedImageUrl(json.urls.raw, 500), 500),
				new SizedPhoto(buildSizedImageUrl(json.urls.raw, 320), 320)
			],
			json.links.html,
			null,
			null,
			new Creator(
				json.user.id,
				json.user.username,
				json.user.name,
				json.user.links.html,
				json.user.profile_image.large
			)
		);
	}
}

module.exports = UnsplashSource;

function buildSizedImageUrl(imageUrl, width, height) {
	imageUrl = url.parse(imageUrl);
	imageUrl.query = imageUrl.query || {};
	if (width) {
		imageUrl.query.w = width;
	}
	if (height) {
		imageUrl.query.h = height;
	}
	imageUrl.query.fit = "max";

	return url.format(imageUrl);
}
