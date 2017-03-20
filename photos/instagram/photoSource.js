require("dotenv").config();

const PhotoSource = require("../photoSource");
const Photo = require("me.common.js/lib/photo");
const Creator = require("me.common.js/lib/creator");
const SizedPhoto = require("me.common.js/lib/sizedPhoto");
const SearchParams = require("../searchParams");
const Instagram = require("instagram-api");
const Moment = require("moment");
const _ = require("lodash");

class InstagramSource extends PhotoSource {
	constructor() {
		super("Instagram", new Instagram(process.env.INSTAGRAM_ACCESS_TOKEN));
	}

	getUserPhotos(params) {
		params = params instanceof SearchParams ? params : new SearchParams(params);
		const client = this.client;
		const userId = process.env.INSTAGRAM_USER_ID;
		let instagramRequest = Promise.resolve(userId);

		if (!userId) {
			instagramRequest = client.userSearch(process.env.INSTAGRAM_USER_NAME)
				.then((userJson) => {
					return _.find(userJson.data, {username: process.env.INSTAGRAM_USER_NAME}).id;
				});
		}

		return instagramRequest
			.then((userId) => {
				return client.userMedia(userId, params.Instagram);
			})
			.then((mediaJson) => {
				return Promise.all(
					_.chain(mediaJson.data)
						.filter({type: "image"})
						.map(_.bind((photoJson) => {
							return this.getPhoto(photoJson.id);
						}, this))
						.value()
				);
			});
	}

	getPhoto(photoId) {
		return this.client.media(photoId)
			.then((photoJson) => {
				return this.jsonToPhoto(photoJson.data);
			});
	}

	jsonToPhoto(photoJson) {
		const sizedPhotos = Object.keys(photoJson.images).map((key) => {
			const image = photoJson.images[key];
			return new SizedPhoto(image.url, image.width, image.height, key);
		});

		const biggestOfficialPhoto = _.last(_.sortBy(sizedPhotos, ["width"]));
		const maxWidth = biggestOfficialPhoto.width < biggestOfficialPhoto.height ? 1080 * (biggestOfficialPhoto.width / biggestOfficialPhoto.height) : 1080;
		const maxHeight = biggestOfficialPhoto.height < biggestOfficialPhoto.width ? 1080 * (biggestOfficialPhoto.height / biggestOfficialPhoto.width) : 1080;

		sizedPhotos.push(new SizedPhoto(
			biggestOfficialPhoto.url
				.replace(`/s${biggestOfficialPhoto.width}x${biggestOfficialPhoto.width}`, ""),
			maxWidth,
			maxHeight,
			"maxRes"
		));

		return new Photo(
			photoJson.id,
			null,
			this.type,
			Moment(parseInt(photoJson.created_time, 10) * 1000),
			null,
			biggestOfficialPhoto.width,
			biggestOfficialPhoto.height,
			sizedPhotos,
			photoJson.link,
			photoJson.location && photoJson.location.name,
			photoJson.caption && photoJson.caption.text,
			new Creator(
				photoJson.user.username,
				photoJson.user.username,
				photoJson.user.full_name,
				`https://www.instagram.com/${photoJson.user.username}`
			)
		);
	}

	get isEnabled() {
		return !!process.env[`${this.type.toUpperCase()}_ACCESS_TOKEN`];
	}
}

module.exports = InstagramSource;
