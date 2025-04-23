
sudo apt update

sudo apt install -y pkg-config software-properties-common

sudo add-apt-repository -y ppa:ubuntuhandbook1/libheif

sudo apt update

sudo apt install -y \
  libvips-dev \
  libheif-dev \
  libheif1 \
  heif-thumbnailer \
  libheif-plugin-libde265 \
  libheif-plugin-x265 \
  libheif-plugin-aomdec \
  libheif-plugin-aomenc \
  libheif-plugin-dav1d


rm -rf node_modules

SHARP_FORCE_GLOBAL_LIBVIPS=true bun add sharp@0.33.2 --build-from-source
