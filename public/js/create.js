jQuery(function() {
    $('.tenor-load').each(function(i, img) {
        var gif_id = $(img).attr('gif-id');
        var token = $(img).attr('token');

        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/tenor/find', true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = (e) => { // Call a function when the state changes.
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                var a = JSON.parse(xhr.response);
                var src = a["results"][0]["media"][0]["gif"]["url"];
                $(img).attr('src', src);
            }
        }
        xhr.send(`_csrf=${token}&id=${gif_id}`);
    });

    
    var lmt = 30;
    $(".text").keyup(function() {
        $(".searched_content").empty();
        var query = $(".text").val();
        var token = $('.text').attr('token');

        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/tenor/search', true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = () => { // Call a function when the state changes.
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                var a = JSON.parse(xhr.response);
                var i = 0;
                while (i < a['results'].length) {
                    var src = a["results"][i]["media"][0]["tinygif"]["url"];
                    var id = a['results'][i]['id'];
                    var img = $('<img />')
                    .addClass('pic')
                    .attr('src', src)
                    .attr('gif-id', id)
                    .on('click', function(e) {
                        $('#gifId').val($(this).attr('gif-id')+"").trigger('keyup');
                    });
                    $(".searched_content").append(img);
                    i++;
                }
            }
        }
        xhr.send(`_csrf=${token}&q=${query}&limit=${lmt}`);
    }).trigger('keyup');

    $('#gifId').keyup(function (e) {
        var token = $('#gifId').attr('token');
        var gif_id = $('#gifId').val();

        if (gif_id == '')
            return;

        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/tenor/find', true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onreadystatechange = () => { // Call a function when the state changes.
            if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                var a = JSON.parse(xhr.response);
                var src = '/img/no-gift.png';
                if (a['results'].length != 0) {
                    src = a['results'][0]['media'][0]['gif']['url'];
                }
                $('.preview-gif').attr('src', src)
            }
        }
        xhr.send(`_csrf=${token}&id=${gif_id}`);
    }).trigger('keyup');
    
});