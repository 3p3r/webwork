cmake_minimum_required(VERSION 3.12 FATAL_ERROR)
project(busybox-em)

include(ExternalProject)
include(CheckCXXSourceCompiles)

set(EMCC_ROOT ${CMAKE_CURRENT_SOURCE_DIR}/../emcc-sdk)
set(EMCC_MAIN ${EMCC_ROOT}/upstream/emscripten)

ExternalProject_Add(miniz
  PREFIX miniz
  URL "https://github.com/richgel999/miniz/releases/download/2.1.0/miniz-2.1.0.zip"
  CONFIGURE_COMMAND "" BUILD_COMMAND "" INSTALL_COMMAND ""
  EXCLUDE_FROM_ALL FALSE
  BUILD_IN_SOURCE TRUE
)

ExternalProject_Get_property(miniz SOURCE_DIR)
set(MINIZ_SOURCE_DIR ${SOURCE_DIR})
unset(SOURCE_DIR)

set(LDFLAGS_LIST
  "-lproxyfs.js"
  "-sASSERTIONS=0"
  "-sSINGLE_FILE"
  "-sMODULARIZE"
  "-sFORCE_FILESYSTEM"
  "-sALLOW_MEMORY_GROWTH"
  "-sEXIT_RUNTIME"
  "-sINVOKE_RUN=0"
  "-sEXPORTED_RUNTIME_METHODS=FS,MEMFS,PROXYFS,NODERAWFS,callMain")

set(LDFLAGS_LIST_NODE ${LDFLAGS_LIST} "-sNODERAWFS=1" "-sENVIRONMENT=node")
set(LDFLAGS_LIST_WEB ${LDFLAGS_LIST} "-sNODERAWFS=0" "-sENVIRONMENT=web,worker")

list(JOIN LDFLAGS_LIST_WEB " " BUSYBOX_CONFIG_EXTRA_LDFLAGS)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/.config ${CMAKE_CURRENT_BINARY_DIR}/.config-web)

list(JOIN LDFLAGS_LIST_NODE " " BUSYBOX_CONFIG_EXTRA_LDFLAGS)
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/.config ${CMAKE_CURRENT_BINARY_DIR}/.config-node)

set(BUSYBOX_URL "https://github.com/mirror/busybox/archive/refs/tags/1_32_0.zip")

ExternalProject_Add(busybox-node
  PREFIX busybox-node
  DEPENDS miniz
  URL ${BUSYBOX_URL}
  CONFIGURE_COMMAND
  ${CMAKE_COMMAND} -E copy
  ${CMAKE_CURRENT_SOURCE_DIR}/nanozip.c <SOURCE_DIR>/archival/nanozip.c &&
  ${CMAKE_COMMAND} -E copy
  ${MINIZ_SOURCE_DIR}/miniz.c <SOURCE_DIR>/archival/miniz.c &&
  ${CMAKE_COMMAND} -E copy
  ${MINIZ_SOURCE_DIR}/miniz.h <SOURCE_DIR>/archival/miniz.h &&
  ${CMAKE_COMMAND} -E copy
  ${CMAKE_CURRENT_BINARY_DIR}/.config-node <SOURCE_DIR>/.config &&
  ${CMAKE_COMMAND} -E make_directory <SOURCE_DIR>/arch/em &&
  ${CMAKE_COMMAND} -E copy
  ${CMAKE_CURRENT_SOURCE_DIR}/Makefile <SOURCE_DIR>/arch/em/Makefile
  BUILD_COMMAND ${CMAKE_COMMAND} -E
  env SRCDIR=${CMAKE_CURRENT_SOURCE_DIR}
  env PATH=${EMCC_MAIN}:${EMCC_ROOT}:$ENV{PATH}
  emmake make ARCH=em CROSS_COMPILE=em SKIP_STRIP=y &&
  ${CMAKE_COMMAND} -E copy
  <SOURCE_DIR>/busybox_unstripped.js ${CMAKE_CURRENT_BINARY_DIR}/busybox-node.js
  INSTALL_COMMAND ""
  EXCLUDE_FROM_ALL FALSE
  BUILD_IN_SOURCE TRUE
)

ExternalProject_Add(busybox-web
  PREFIX busybox-web
  DEPENDS miniz
  URL ${BUSYBOX_URL}
  CONFIGURE_COMMAND
  ${CMAKE_COMMAND} -E copy
  ${CMAKE_CURRENT_SOURCE_DIR}/nanozip.c <SOURCE_DIR>/archival/nanozip.c &&
  ${CMAKE_COMMAND} -E copy
  ${MINIZ_SOURCE_DIR}/miniz.c <SOURCE_DIR>/archival/miniz.c &&
  ${CMAKE_COMMAND} -E copy
  ${MINIZ_SOURCE_DIR}/miniz.h <SOURCE_DIR>/archival/miniz.h &&
  ${CMAKE_COMMAND} -E copy
  ${CMAKE_CURRENT_BINARY_DIR}/.config-web <SOURCE_DIR>/.config &&
  ${CMAKE_COMMAND} -E make_directory <SOURCE_DIR>/arch/em &&
  ${CMAKE_COMMAND} -E copy
  ${CMAKE_CURRENT_SOURCE_DIR}/Makefile <SOURCE_DIR>/arch/em/Makefile
  BUILD_COMMAND ${CMAKE_COMMAND} -E
  env SRCDIR=${CMAKE_CURRENT_SOURCE_DIR}
  env PATH=${EMCC_MAIN}:${EMCC_ROOT}:$ENV{PATH}
  emmake make ARCH=em CROSS_COMPILE=em SKIP_STRIP=y &&
  ${CMAKE_COMMAND} -E copy
  <SOURCE_DIR>/busybox_unstripped.js ${CMAKE_CURRENT_BINARY_DIR}/busybox-web.js
  INSTALL_COMMAND ""
  EXCLUDE_FROM_ALL FALSE
  BUILD_IN_SOURCE TRUE
)

set(BUSYBOX_OUT ${CMAKE_CURRENT_BINARY_DIR}/out)
add_custom_target(busybox ALL DEPENDS busybox-node busybox-web)
add_custom_command(TARGET busybox PRE_BUILD
  COMMAND ${CMAKE_COMMAND} -E make_directory ${BUSYBOX_OUT} ${BUSYBOX_OUT}/web ${BUSYBOX_OUT}/node
)
add_custom_command(TARGET busybox POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_if_different
  ${CMAKE_CURRENT_BINARY_DIR}/busybox-web.js ${BUSYBOX_OUT}/web/busybox.js
  COMMAND ${CMAKE_COMMAND} -E copy_if_different
  ${CMAKE_CURRENT_BINARY_DIR}/busybox-node.js ${BUSYBOX_OUT}/node/busybox.js
)
