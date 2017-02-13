require("dotenv").config();

const PhotoSource = require("../photoSource");
const Photo = require("me.common.js/lib/photo");
const Creator = require("me.common.js/lib/creator");
const SizedPhoto = require("me.common.js/lib/sizedPhoto");
const SearchParams = require("../searchParams");
const tumblr = require("tumblr.js");
const Moment = require("moment");
const _ = require("lodash");

class TumblrSource extends PhotoSource {
	constructor() {
		super("Tumblr", tumblr.createClient({
			consumer_key: process.env.TUMBLR_API_KEY,
			consumer_secret: process.env.TUMBLR_API_SECRET,
			returnPromises: true
		}));
	}

	getUserPhotos(params) {
		params = params instanceof SearchParams ? params : new SearchParams(params);

		return this.client.blogPosts(process.env.TUMBLR_USER_NAME, "photo", params.Tumblr)
			.then((response) => {
				return Promise.all(
					response.posts.map((postJson) => {
						return this.getPhoto(postJson.id);
					})
				);
			})
			.then(_.flatten);
	}

	getPhoto(photoId, params) {
		params = params instanceof SearchParams ? params : new SearchParams(params);

		return this.client.blogPosts(process.env.TUMBLR_USER_NAME, "photo", _.extend({id: photoId}, params.Tumblr))
			.then((response) => {
				return Promise.all(
					response.posts.map((postJson) => {
						return Promise.all(
							postJson.photos.map((photoJson) => {
								return this.jsonToPhoto(photoJson, postJson, response.blog);
							})
						);
					})
				);
			})
			.then(_.flatten);
	}

	jsonToPhoto(photoJson, postJson, blogJson) {
		const sizedPhotos = photoJson.alt_sizes.map((photo) => {
			return new SizedPhoto(photo.url, photo.width, photo.height);
		});

		return new Photo(
			postJson.id,
			null,
			this.type,
			Moment(postJson.date),
			null,
			_.last(_.sortBy(sizedPhotos, ["width"])).width,
			_.last(_.sortBy(sizedPhotos, ["height"])).height,
			sizedPhotos,
			postJson.post_url,
			null,
			photoJson.caption || postJson.caption,
			new Creator(
				blogJson.name,
				blogJson.name,
				blogJson.title,
				blogJson.url
			)
		);
	}
}

module.exports = TumblrSource;
